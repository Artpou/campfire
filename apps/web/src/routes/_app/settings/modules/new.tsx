import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { useCreateModule } from "@/features/module/hooks/module.queries";

export const Route = createFileRoute("/_app/settings/modules/new")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "admin", { to: "/settings/general" }),
  validateSearch: (search: Record<string, unknown>) => ({
    type: search.type === "stremio" ? ("stremio" as const) : ("stremio" as const),
  }),
  component: ModuleNewPage,
});

function ModuleNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateModule();
  const [manifestUrl, setManifestUrl] = useState("");

  const install = () => {
    createMutation.mutate(
      { type: "stremio", config: { manifestUrl } },
      {
        onSuccess: (created) => {
          navigate({ to: "/settings/modules/$id", params: { id: created.id } });
        },
      },
    );
  };

  return (
    <section className="space-y-6">
      <Button variant="ghost" size="sm" icon={ArrowLeftIcon} asChild>
        <Link to="/settings/modules">
          <Trans>Back</Trans>
        </Link>
      </Button>

      <Input
        label={<Trans>Manifest URL</Trans>}
        placeholder="https://…/manifest.json"
        value={manifestUrl}
        onChange={(e) => setManifestUrl(e.target.value)}
      />

      <div className="flex justify-end">
        <Button onClick={install} disabled={!manifestUrl || createMutation.isPending}>
          <Trans>Install</Trans>
        </Button>
      </div>
    </section>
  );
}
