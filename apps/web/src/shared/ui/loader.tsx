import type * as React from "react";

import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoaderProps extends React.ComponentProps<typeof LoaderCircleIcon> {
  className?: string;
}

function Loader({ className, ...props }: LoaderProps) {
  return (
    <LoaderCircleIcon
      className={cn("animate-spin", className)}
      aria-label="Loading"
      aria-busy="true"
      {...props}
    />
  );
}

export { Loader };
