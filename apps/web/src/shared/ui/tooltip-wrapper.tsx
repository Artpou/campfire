import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export function TooltipWrapper({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: React.ReactNode;
}) {
  if (!tooltip) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
