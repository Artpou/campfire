import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { api } from "@/lib/api";
import { FileExplorer, type FileItem } from "@/shared/file-explorer";

export const Route = createFileRoute("/_app/server")({
  component: ServerPage,
});

function ServerPage() {
  const [currentPath, setCurrentPath] = useState("/");

  const { data, isLoading } = useQuery({
    queryKey: ["freebox", "files", currentPath],
    queryFn: async () => {
      const apiWithFreebox = (
        api as unknown as {
          freebox: {
            files: {
              get: (params: {
                $query: { path: string };
              }) => Promise<{ data: { files: unknown[] } }>;
            };
          };
        }
      ).freebox;
      const response = await apiWithFreebox.files.get({
        $query: { path: currentPath },
      });
      return { files: response.data.files as FileItem[] };
    },
  });

  return (
    <div className="size-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-semibold">Freebox Explorer</h1>
      </div>
      <FileExplorer
        files={data?.files ?? []}
        currentPath={currentPath}
        isLoading={isLoading}
        onNavigate={setCurrentPath}
      />
    </div>
  );
}
