import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { CreateIndexerManagerInput } from "@seedarr/contracts";
import type { IndexerManager, StremioManifest } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { IndexersManagerAddDialog } from "@/features/indexers-manager/components/indexers-manager-add-dialog";
import { IndexersManagerCard } from "@/features/indexers-manager/components/indexers-manager-card";
import { indexerManagerQueries } from "@/features/torrent/hooks/indexer.queries";

export function SettingsIndexersTab() {
  const queryClient = useQueryClient();
  const { t } = useLingui();
  const { data: managers = [] } = useQuery(indexerManagerQueries.list());

  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreateIndexerManagerInput) => unwrap(api["indexer-manager"].$post({ json: data })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: indexerManagerQueries.key });
      setAddDialogOpen(false);
    },
  });

  const getManifest = (manager: IndexerManager): StremioManifest | null => {
    return (manager.manifest as StremioManifest | null) ?? null;
  };

  const getDisplayTitle = (manager: IndexerManager): string => {
    if (manager.indexerType === "prowlarr") return "Prowlarr";
    if (manager.indexerType === "jackett") return "Jackett";
    if (manager.indexerType === "stremio") {
      return getManifest(manager)?.name ?? "Stremio Addon";
    }
    return manager.indexerType;
  };

  const filteredManagers = managers.filter((manager) => {
    const title = getDisplayTitle(manager).toLowerCase();
    const url = (manager.indexerUrl || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query) || url.includes(query);
  });

  return (
    <section className="space-y-6">
      <div>
        <h2>
          <Trans>Indexer Managers</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>
            Seedarr is a neutral tool. Enabling third-party indexers may give you access to copyrighted content. You are
            responsible for complying with the laws in your country.
          </Trans>
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Input
            placeholder={t(msg`Search an indexer...`)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            h="lg"
            search
          />
          <Button onClick={() => setAddDialogOpen(true)} className="w-full sm:w-auto shrink-0">
            <PlusIcon className="size-4" />
            <Trans>Add indexer</Trans>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredManagers.map((manager) => (
          <IndexersManagerCard key={manager.id} manager={manager} />
        ))}

        {filteredManagers.length === 0 && (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <Trans>No source found.</Trans>
          </div>
        )}
      </div>

      <IndexersManagerAddDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
    </section>
  );
}
