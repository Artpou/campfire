import { useState } from "react";

import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { api, type IndexerManager, type StremioManifest, type UpdateIndexerManagerInput, unwrap } from "@seedarr/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SettingsIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

import { IndexersManagerEditDialog } from "@/features/indexers-manager/components/indexers-manager-edit-dialog";
import { indexersManagerImages } from "@/features/indexers-manager/helpers/indexers-manager.helper";
import { indexerManagerQueries } from "@/features/torrent/hooks/indexer.queries";

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

const getSourceLogo = (manager: IndexerManager): string | undefined => {
  if (manager.indexerType === "stremio") {
    return getManifest(manager)?.logo ?? indexersManagerImages[manager.indexerType];
  }
  return indexersManagerImages[manager.indexerType];
};

interface IndexersManagerCardProps {
  manager: IndexerManager;
}

export function IndexersManagerCard({ manager }: IndexersManagerCardProps) {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState<"add" | "edit" | "delete" | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: indexerManagerQueries.key });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateIndexerManagerInput) =>
      unwrap(api["indexer-manager"][":id"].$patch({ param: { id }, json: data })),
    onSuccess: () => {
      invalidateAll();
      setDialogOpen(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unwrap(api["indexer-manager"][":id"].$delete({ param: { id } })),
    onSuccess: () => {
      invalidateAll();
      setDialogOpen(null);
      toast.success(t`Source uninstalled`);
    },
    onError: (error) => {
      toast.error(t`Could not uninstall source`, {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const logo = getSourceLogo(manager);
  const title = getDisplayTitle(manager);
  const manifest = getManifest(manager);
  const isStremio = manager.indexerType === "stremio";

  return (
    <>
      <Card key={manager.id} className={cn(manager.disabled && "opacity-60")}>
        <CardContent className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0 flex-1">
            {logo && <img src={logo} alt={title} className="size-16 object-contain shrink-0 rounded-md" />}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="font-bold ">{title}</h2>
                {manager.disabled && (
                  <Badge variant="outline" className="text-xs py-0.5 px-2">
                    <Trans>Disabled</Trans>
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground truncate font-mono">
                {isStremio ? `${manager.indexerUrl}/manifest.json` : manager.indexerUrl}
              </p>

              {isStremio && manifest?.description && (
                <p className="text-sm text-popover-foreground mt-1 line-clamp-2">{manifest.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isStremio && (
              <Button variant="outline" onClick={() => setDialogOpen("edit")}>
                <SettingsIcon />
              </Button>
            )}
            <Button variant="destructive" onClick={() => setDialogOpen("delete")}>
              <TrashIcon />
              <Trans>Uninstall</Trans>
            </Button>
          </div>
        </CardContent>
      </Card>

      <IndexersManagerEditDialog
        open={dialogOpen === "edit"}
        onOpenChange={(open) => setDialogOpen(open ? "edit" : null)}
        manager={dialogOpen === "edit" ? manager : null}
        onSubmit={(data) => updateMutation.mutate(data)}
        isPending={updateMutation.isPending}
      />

      <DialogDelete
        open={dialogOpen === "delete"}
        setOpen={(open) => setDialogOpen(open ? "delete" : null)}
        validate={() => deleteMutation.mutate(manager.id)}
        title={<Trans>Uninstall source</Trans>}
        description={<Trans>Are you sure you want to uninstall this source? This action cannot be undone.</Trans>}
      />
    </>
  );
}
