import type { CreateModuleInput, UpdateModuleInput } from "@seedarr/contracts";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const moduleQueries = {
  key: ["modules"] as const,
  catalog: () =>
    queryOptions({
      queryKey: [...moduleQueries.key, "catalog"],
      queryFn: () => unwrap(api.modules.catalog.$get()),
      staleTime: 5 * 60_000,
    }),
  list: () =>
    queryOptions({
      queryKey: [...moduleQueries.key, "list"],
      queryFn: () => unwrap(api.modules.$get()),
    }),
  get: (id: string) =>
    queryOptions({
      queryKey: [...moduleQueries.key, id],
      queryFn: () => unwrap(api.modules[":id"].$get({ param: { id } })),
    }),
  health: (id: string) =>
    queryOptions({
      queryKey: [...moduleQueries.key, id, "health"],
      queryFn: () => unwrap(api.modules[":id"].health.$get({ param: { id } })),
      staleTime: 30_000,
      retry: false,
    }),
};

export function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (json: CreateModuleInput) => unwrap(api.modules.$post({ json })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: moduleQueries.key });
      toast.info("Module installed", { description: data.label });
    },
    onError: (error) => {
      toast.error("Could not install module", { description: formatError(error) });
    },
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...json }: UpdateModuleInput & { id: string }) =>
      unwrap(api.modules[":id"].$patch({ param: { id }, json })),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: moduleQueries.key });
      queryClient.invalidateQueries({ queryKey: [...moduleQueries.key, vars.id] });
    },
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.modules[":id"].$delete({ param: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moduleQueries.key });
      toast.info("Module uninstalled");
    },
    onError: (error) => {
      toast.error("Could not uninstall module", { description: formatError(error) });
    },
  });
}
