import { eq } from "drizzle-orm";

import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { plexConfig } from "@/db/schema";
import type { PlexConfig, UpdatePlexConfigInput } from "./plex.dto";

const SINGLETON_ID = "singleton";

export class PlexService extends AuthenticatedService {
  async getConfig(): Promise<PlexConfig | null> {
    const [result] = await db
      .select()
      .from(plexConfig)
      .where(eq(plexConfig.id, SINGLETON_ID))
      .limit(1);
    return result ?? null;
  }

  async updateConfig(data: UpdatePlexConfigInput): Promise<PlexConfig> {
    const existing = await this.getConfig();

    if (!existing) {
      const [result] = await db
        .insert(plexConfig)
        .values({
          id: SINGLETON_ID,
          ...data,
        })
        .returning();
      return result;
    }

    const [result] = await db
      .update(plexConfig)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(plexConfig.id, SINGLETON_ID))
      .returning();
    return result;
  }

  async fetchServers(token: string): Promise<unknown[]> {
    try {
      const response = await fetch("https://plex.tv/api/resources?includeHttps=1", {
        headers: {
          "X-Plex-Token": token,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch servers from Plex TV");
      }

      // Plex returns XML by default, but we asked for JSON.
      // Note: Plex TV API is notoriously finicky with JSON.
      // If it fails, we might need a parser, but let's try JSON first.
      const data = (await response.json()) as unknown[];
      return data;
    } catch (error) {
      console.error("Error fetching Plex servers:", error);
      return [];
    }
  }

  async syncLibrary(options: {
    movies?: boolean;
    tv?: boolean;
    downloads?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    // Stub for library sync logic
    console.log("Syncing Plex library with options:", options);
    return { success: true, message: "Sync started" };
  }
}
