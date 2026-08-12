import type { CreateIndexerManagerInput, UpdateIndexerManagerInput } from "@seedarr/contracts";
import { STREMIO_PRESETS } from "@seedarr/shared";
import { count, eq, inArray } from "drizzle-orm";

import { BadRequestError, NotFoundError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { assertPublicHttpUrl, assertSafeIndexerUrl } from "@/shared/helpers/url.helper";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import {
  type IndexerManager,
  indexerManager,
  type StremioManifest,
} from "@/modules/indexer-manager/indexer-manager.schema";
import type { IndexerAdapter } from "@/modules/torrent/adapters/indexer.adapter";
import { JackettAdapter } from "@/modules/torrent/adapters/jackett.adapter";
import { ProwlarrAdapter } from "@/modules/torrent/adapters/prowlarr.adapter";
import { StremioAdapter } from "@/modules/torrent/adapters/stremio.adapter";
import type { Indexer, IndexerManagerWithIndexers } from "./indexer-manager.types";

type IndexerManagerDto = IndexerManager | IndexerManagerWithIndexers;

async function fetchManifest(manifestUrl: string): Promise<StremioManifest> {
  const MAX_REDIRECT_DEPTH = 5;
  let currentUrl = manifestUrl;

  for (let depth = 0; depth <= MAX_REDIRECT_DEPTH; depth++) {
    await assertPublicHttpUrl(currentUrl);

    const response = await fetch(currentUrl, { redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new BadRequestError("Manifest redirect without Location header");
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new BadRequestError(`Failed to fetch manifest from ${manifestUrl} (${response.status})`);
    }
    return (await response.json()) as StremioManifest;
  }

  throw new BadRequestError("Too many redirects while fetching manifest");
}

function resolveManifestUrl(data: Extract<CreateIndexerManagerInput, { type: "STREMIO_ADDON" | "PRESET" }>): string {
  if (data.type === "PRESET") {
    return STREMIO_PRESETS[data.preset];
  }
  return data.manifestUrl;
}

function deriveBaseUrl(manifestUrl: string): string {
  return manifestUrl.replace(/\/manifest\.json$/, "");
}

export class IndexerManagerService extends IdentifiableService<IndexerManager> {
  private adapterCache = new Map<string, IndexerAdapter>();

  getAdapter(indexerManager: IndexerManager): IndexerAdapter {
    const cached = this.adapterCache.get(indexerManager.id);
    if (cached) return cached;

    let adapter: IndexerAdapter;
    if (indexerManager.indexerType === "prowlarr") {
      adapter = new ProwlarrAdapter(indexerManager);
    } else if (indexerManager.indexerType === "jackett") {
      adapter = new JackettAdapter(indexerManager);
    } else {
      adapter = new StremioAdapter(indexerManager);
    }

    this.adapterCache.set(indexerManager.id, adapter);
    return adapter;
  }

  private async addIndexers(manager: IndexerManager): Promise<IndexerManagerWithIndexers> {
    let indexers: Indexer[] = [];
    if (manager.disabled) return { ...manager, indexers };

    const adapter = this.getAdapter(manager);

    try {
      indexers = await adapter.getIndexers();
    } catch (error) {
      logger.error(adapter.indexerManager.indexerType, "failed to get indexers", error);
    }
    return { ...manager, indexers };
  }

  async getMany(options: { ids?: string[]; withIndexers: true }): Promise<IndexerManagerWithIndexers[]>;
  async getMany(options: { ids?: string[]; withIndexers?: false }): Promise<IndexerManager[]>;
  async getMany(options: { ids?: string[]; withIndexers?: boolean }): Promise<IndexerManagerDto[]> {
    const managers = (
      await db.query.indexerManager.findMany({
        where: options.ids ? inArray(indexerManager.id, options.ids) : undefined,
      })
    ).map((manager) => {
      if (this.roleLevel < ROLE_LEVELS.admin) manager.indexerApiKey = "";
      return manager;
    });

    if (!options.withIndexers) return managers;

    return await Promise.all(managers.map((manager) => this.addIndexers(manager)));
  }

  async get(id: string): Promise<IndexerManagerWithIndexers> {
    const managers = await this.getMany({ ids: [id], withIndexers: true });
    if (!managers[0]) throw new NotFoundError("Indexer Manager");
    return managers[0];
  }

  async count(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(indexerManager);
    return result?.count ?? 0;
  }

  async create(data: CreateIndexerManagerInput): Promise<IndexerManagerWithIndexers> {
    let values: typeof indexerManager.$inferInsert;

    if (data.type === "SELF_HOSTED") {
      assertSafeIndexerUrl(data.indexerUrl);
      values = {
        indexerType: data.indexerType,
        indexerUrl: data.indexerUrl,
        indexerApiKey: data.indexerApiKey,
      };
    } else {
      const manifestUrl = resolveManifestUrl(data);
      const manifest = await fetchManifest(manifestUrl);
      values = {
        indexerType: "stremio",
        indexerUrl: deriveBaseUrl(manifestUrl),
        manifest,
      };
    }

    const [created] = await db.insert(indexerManager).values(values).returning();

    ActivityLogService.log({
      userId: this.user.id,
      type: "SUCCESS",
      action: "INDEXER_ADD",
      title: `Indexer added: ${values.indexerType}`,
      metadata: { indexerManagerId: created.id, indexerType: values.indexerType },
    });

    return this.addIndexers(created);
  }

  async update(id: string, data: UpdateIndexerManagerInput): Promise<IndexerManagerWithIndexers> {
    const existing = await db.query.indexerManager.findFirst({
      where: eq(indexerManager.id, id),
    });
    if (!existing) throw new NotFoundError("IndexerManager");

    const updateData: Partial<typeof indexerManager.$inferInsert> = {};

    if (data.indexerUrl) {
      assertSafeIndexerUrl(data.indexerUrl);
      updateData.indexerUrl = data.indexerUrl;
    }
    if (data.indexerApiKey) updateData.indexerApiKey = data.indexerApiKey;
    if (data.disabled !== undefined) updateData.disabled = data.disabled;

    if (existing.indexerType === "stremio" && data.manifestUrl) {
      const manifest = await fetchManifest(data.manifestUrl);
      updateData.indexerUrl = deriveBaseUrl(data.manifestUrl);
      updateData.manifest = manifest;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(indexerManager).set(updateData).where(eq(indexerManager.id, id));
    }

    const updated = await db.query.indexerManager.findFirst({
      where: eq(indexerManager.id, id),
    });
    if (!updated) throw new NotFoundError("IndexerManager");

    return this.addIndexers(updated);
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await db.query.indexerManager.findFirst({ where: eq(indexerManager.id, id) });
    if (!existing) throw new NotFoundError("IndexerManager");
    await db.delete(indexerManager).where(eq(indexerManager.id, id));
    ActivityLogService.log({
      userId: this.user.id,
      type: "INFO",
      action: "INDEXER_DELETE",
      title: `Indexer removed: ${existing.indexerType}`,
      metadata: { indexerManagerId: id },
    });
    return { success: true };
  }
}
