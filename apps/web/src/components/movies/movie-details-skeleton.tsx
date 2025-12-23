import { Skeleton } from "@/components/ui/skeleton";

export function MovieDetailsSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section Skeleton */}
      <div className="relative flex flex-col justify-end">
        {/* Background Skeleton */}
        <div className="absolute inset-0 bg-muted/20">
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/80 to-background" />
          <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/40 to-transparent" />
        </div>

        {/* Banner Content Skeleton */}
        <div className="relative z-10 px-6 md:px-12 h-full flex flex-col justify-end pb-6 pt-12 w-full">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Poster Skeleton */}
            <div className="hidden md:flex flex-col gap-0 w-56 shrink-0">
              <Skeleton className="aspect-2/3 w-full rounded-md border border-white/10 shadow-2xl" />
              <Skeleton className="w-full mt-0 h-10 rounded-b-md rounded-t-none" />
            </div>

            {/* Info Skeleton */}
            <div className="flex-1 space-y-4 pb-4">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-12 w-2/3" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <span className="opacity-30">•</span>
                  <Skeleton className="h-5 w-16" />
                  <span className="opacity-30">•</span>
                  <Skeleton className="h-5 w-40" />
                </div>
              </div>

              {/* Synopsis Skeleton in Hero */}
              <div className="max-w-3xl space-y-2">
                <Skeleton className="h-4 w-1/3 italic" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>

              {/* Stats & Providers Skeleton */}
              <div className="flex items-center gap-4">
                <Skeleton className="size-[52px] rounded-full" />
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i.toString()} className="size-9 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="px-6 md:px-12 mt-6 flex flex-col gap-12 w-full">
        <div className="space-y-10">
          {/* Torrents List Skeleton */}
          <div className="space-y-6 pt-10 pb-20 w-full">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index.toString()} className="h-14 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
