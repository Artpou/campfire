import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Container } from "@/shared/ui/container";

import { MediaGrid } from "@/features/media/components/media-grid";
import { useMediaSearch } from "@/features/media/hooks/use-media";

export interface SearchParams {
  q?: string;
}

export const Route = createFileRoute("/_app/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: typeof search.q === "string" ? search.q : undefined,
    };
  },
});

function SearchPage() {
  const { q } = Route.useSearch();

  const { data: searchResults = [], isLoading } = useMediaSearch(q || "");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center size-full">
        <SeedarrLoader />
      </div>
    );
  }

  return (
    <Container>
      {!q ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Search className="size-16 text-muted-foreground/20 mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            <Trans>Search for Movies and TV Shows</Trans>
          </h2>
          <p className="text-muted-foreground">
            <Trans>Use the search box in the sidebar to get started</Trans>
          </p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-4">
          <AppBreadcrumb items={[{ name: "Search", link: "/search" }, { name: q }]} />
          <MediaGrid items={searchResults} withType />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Search className="size-16 text-muted-foreground/20 mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            <Trans>No results found for "{q}"</Trans>
          </h2>
          <p className="text-muted-foreground">
            <Trans>Try a different search term</Trans>
          </p>
        </div>
      )}
    </Container>
  );
}
