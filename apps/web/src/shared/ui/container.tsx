import { cn } from "@/lib/utils";

export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  full?: boolean;
}

export function Container({ children, className, full = false }: ContainerProps) {
  return (
    <div
      className={cn(
        "container mx-auto p-3 sm:p-6 pb-20 space-y-8",
        full && "pb-20! flex flex-col items-center justify-center w-full h-screen",
        className,
      )}
    >
      {children}
    </div>
  );
}
