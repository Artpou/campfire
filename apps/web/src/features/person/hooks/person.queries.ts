import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const personQueries = {
  details: (id: string, locale: string) =>
    queryOptions({
      queryKey: ["person", id, locale],
      queryFn: async () => unwrap(api.person[":id"].$get({ param: { id }, query: { locale } })),
    }),
};
