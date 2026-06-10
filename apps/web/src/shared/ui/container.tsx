import { cn } from "@/lib/utils";

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("container mx-auto p-3 sm:p-6 pb-20 space-y-8", className)}>{children}</div>;
}
