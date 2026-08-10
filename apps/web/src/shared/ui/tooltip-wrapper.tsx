import type * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

interface TooltipWrapperProps extends React.ComponentProps<typeof TooltipPrimitive.Root> {
  children: React.ReactNode;
  tooltip: React.ReactNode;
}

export function TooltipWrapper({ children, tooltip, ...props }: TooltipWrapperProps) {
  if (!tooltip) {
    return children;
  }

  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
