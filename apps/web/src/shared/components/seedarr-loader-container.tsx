import { cn } from "@/lib/utils";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";

export function SeedarrLoaderContainer({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center size-full", className)}>
      <SeedarrLoader />
    </div>
  );
}
