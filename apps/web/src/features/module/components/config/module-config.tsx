import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { Module } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { Card } from "@/shared/ui/card";

import { ModuleConfigIndexer } from "@/features/module/components/config/module-config-indexer";
import { ModuleConfigLetterboxd } from "@/features/module/components/config/module-config-letterboxd";
import { ModuleConfigStorage } from "@/features/module/components/config/module-config-storage";
import { ModuleConfigStremioAddon } from "@/features/module/components/config/module-config-stremio-addon";
import { ModuleConfigSystemKey } from "@/features/module/components/config/module-config-system-key";
import { ModuleCardHorizontal } from "@/features/module/components/module-card-horizontal";
import { moduleQueries, useDeleteModule, useUpdateModule } from "@/features/module/hooks/module.queries";

interface ModuleConfigProps {
  moduleId: string;
}

function ModuleConfigFields({ mod }: { mod: Module }) {
  switch (mod.type) {
    case "tmdb":
    case "subdl":
      return <ModuleConfigSystemKey mod={mod} />;
    case "jackett":
    case "prowlarr":
      return <ModuleConfigIndexer mod={mod} />;
    case "stremio":
      return <ModuleConfigStremioAddon mod={mod} />;
    case "letterboxd":
      return <ModuleConfigLetterboxd mod={mod} />;
    case "webdav":
    case "ftp":
      return <ModuleConfigStorage mod={mod} />;
    default:
      return null;
  }
}

export function ModuleConfig({ moduleId }: ModuleConfigProps) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { data: mod, isLoading } = useQuery(moduleQueries.get(moduleId));
  const updateMutation = useUpdateModule();
  const deleteMutation = useDeleteModule();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading || !mod) {
    return (
      <p className="text-muted-foreground">
        <Trans>Loading…</Trans>
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <ModuleCardHorizontal
        mod={mod}
        enabled={mod.enabled}
        enabledDisabled={updateMutation.isPending}
        onEnabledChange={(enabled) =>
          updateMutation.mutate(
            { id: mod.id, enabled },
            {
              onError: (error) => toast.error(t(msg`Could not update module`), { description: formatError(error) }),
            },
          )
        }
        onUninstall={() => setDeleteOpen(true)}
        uninstallPending={deleteMutation.isPending}
      />

      <Card className="border bg-transparent p-4 md:p-5 shadow-none">
        <ModuleConfigFields mod={mod} />
      </Card>

      <DialogDelete
        open={deleteOpen}
        setOpen={setDeleteOpen}
        validate={() =>
          deleteMutation.mutate(mod.id, {
            onSuccess: () => navigate({ to: "/settings/modules" }),
          })
        }
        disabled={deleteMutation.isPending}
        title={<Trans>Uninstall {mod.label}</Trans>}
        description={<Trans>This removes the module configuration. This action cannot be undone.</Trans>}
      />
    </section>
  );
}
