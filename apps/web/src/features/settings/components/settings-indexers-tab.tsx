import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { IndexerManager, IndexerType } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PencilIcon, PlusIcon, PowerIcon, PowerOffIcon, SettingsIcon, TrashIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Flag } from "@/shared/components/flag";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

import { IndexersManagerAddDialog } from "@/features/indexers-manager/components/indexers-manager-add-dialog";
import { IndexersManagerEditDialog } from "@/features/indexers-manager/components/indexers-manager-edit-dialog";
import { indexersManagerImages } from "@/features/indexers-manager/helpers/indexers-manager.helper";
import { indexerManagerQueries } from "@/features/torrent/hooks/indexer.queries";

export function SettingsIndexersTab() {
  const queryClient = useQueryClient();
  const { data: managers = [] } = useQuery(indexerManagerQueries.list());
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const selectedManager = managers.find((m) => m.id === selectedManagerId) ?? managers[0] ?? null;
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editManager, setEditManager] = useState<IndexerManager | null>(null);
  const hasStremio = managers.some((manager) => manager.indexerType === "stremio");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: indexerManagerQueries.key });
    queryClient.invalidateQueries({ queryKey: ["torrent-indexers"] });
    queryClient.invalidateQueries({ queryKey: ["indexer-manager"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: {
      indexerType: IndexerType;
      indexerUrl?: string;
      indexerApiKey?: string;
      providers?: string[];
    }) => unwrap(api["indexer-manager"].$post({ json: data })),
    onSuccess: () => {
      invalidateAll();
      setAddDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      indexerUrl?: string;
      indexerApiKey?: string;
      providers?: string[];
      disabled?: boolean;
    }) => unwrap(api["indexer-manager"][":id"].$patch({ param: { id }, json: data })),
    onSuccess: () => {
      invalidateAll();
      setEditDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unwrap(api["indexer-manager"][":id"].$delete({ param: { id } })),
    onSuccess: () => {
      invalidateAll();
      setSelectedManagerId(null);
    },
  });

  const handleEdit = (manager: IndexerManager) => {
    setEditManager(manager);
    setEditDialogOpen(true);
  };

  const handleToggleDisabled = (manager: IndexerManager) => {
    updateMutation.mutate({ id: manager.id, disabled: !manager.disabled });
  };

  if (!selectedManager) return null;

  const indexers = selectedManager?.indexers ?? [];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden shadow-sm gap-0 pb-0">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="size-5 text-popover-foreground" />
            <CardTitle>
              <Trans>Indexer Managers</Trans>
            </CardTitle>
          </div>
          <CardDescription>
            <Trans>Configure your torrent indexers (Prowlarr, Jackett, Stremio).</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 border-t">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border min-h-[380px]">
            <div className="flex flex-col justify-between">
              <div className="flex flex-col w-full">
                <div className="flex items-center h-12 px-4 border-b">
                  <span className="text-xs font-semibold text-popover-foreground uppercase tracking-wider">
                    <Trans>Sources</Trans>
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {managers.map((manager) => {
                    const isSelected = selectedManager?.id === manager.id;
                    return (
                      <button
                        key={manager.id}
                        type="button"
                        onClick={() => setSelectedManagerId(manager.id)}
                        className={cn(
                          "flex items-center justify-between w-full text-left px-4 py-3 relative transition-colors",
                          isSelected
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted text-popover-foreground hover:text-foreground",
                          manager.disabled && "opacity-50",
                        )}
                      >
                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={indexersManagerImages[manager.indexerType]}
                            alt={manager.indexerType}
                            className="size-4 object-contain shrink-0"
                          />
                          <span className="text-sm font-medium truncate">
                            {manager.indexerType === "stremio" ? "Torrentio" : manager.indexerUrl}
                          </span>
                          {manager.disabled && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              <Trans>Disabled</Trans>
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={manager.disabled ? "Enable" : "Disable"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleDisabled(manager);
                            }}
                          >
                            {manager.disabled ? (
                              <PowerOffIcon className="size-4 text-muted-foreground" />
                            ) : (
                              <PowerIcon className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(manager);
                            }}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(manager.id);
                            }}
                          >
                            <TrashIcon className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </button>
                    );
                  })}
                  {managers.length === 0 && (
                    <div className="py-12 text-center text-sm text-popover-foreground px-4">
                      <Trans>No indexer managers configured.</Trans>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border">
                <Button className="w-full" onClick={() => setAddDialogOpen(true)}>
                  <PlusIcon className="size-4" />
                  <Trans>Add Indexer Manager</Trans>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col">
              {selectedManager ? (
                <>
                  <div className="flex items-center justify-between h-12 px-4 border-b shrink-0">
                    <span className="text-xs font-semibold text-popover-foreground uppercase tracking-wider">
                      {selectedManager.indexerType} <Trans>Indexers</Trans>
                    </span>
                    {selectedManager.indexerType === "stremio" ? (
                      <Button size="sm" onClick={() => handleEdit(selectedManager)}>
                        <PencilIcon className="size-4" />
                        <Trans>Edit providers</Trans>
                      </Button>
                    ) : (
                      <Button asChild size="sm">
                        <Link to="/settings/indexer" search={{ managerId: selectedManager.id }}>
                          <SettingsIcon className="size-4" />
                          <Trans>Configure</Trans>
                        </Link>
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 bg-background/70 overflow-y-auto">
                    {selectedManager.indexerType === "stremio" ? (
                      <div className="py-12 text-center text-sm text-popover-foreground px-4">
                        <Trans>Providers are configured via the Torrentio addon URL.</Trans>
                      </div>
                    ) : indexers.length > 0 ? (
                      <div className="divide-y divide-border">
                        {indexers.map((idx) => (
                          <div
                            key={idx.id || idx.name}
                            className="flex items-center justify-between px-4 py-3 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {idx.lang && <Flag lang={idx.lang} />}
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-foreground">{idx.label || idx.name}</span>
                                {idx.description && (
                                  <span className="text-xs text-muted-foreground truncate max-w-md">
                                    {idx.description}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="font-normal">
                                {idx.privacy || "public"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-sm text-popover-foreground">
                        <Trans>No indexers found for this manager.</Trans>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-sm text-popover-foreground">
                  <Trans>Select a source to view its indexers.</Trans>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <IndexersManagerAddDialog
        managers={managers}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        hasStremio={hasStremio}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <IndexersManagerEditDialog
        managers={managers}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        manager={editManager}
        onSubmit={(data) => updateMutation.mutate(data)}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}
