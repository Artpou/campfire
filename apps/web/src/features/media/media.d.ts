import type { ApiData, api } from "@/lib/api";

export type Media = ApiData<ReturnType<ReturnType<typeof api.media>["get"]>>;
