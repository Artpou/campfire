import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

interface SortableColumn {
  getCanSort: () => boolean;
  getIsSorted: () => false | "asc" | "desc";
  toggleSorting: (desc?: boolean) => void;
}

interface DataTableColumnHeaderProps {
  column: SortableColumn;
  title: React.ReactNode;
  className?: string;
}

export function DataTableColumnHeader({ column, title, className }: DataTableColumnHeaderProps) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-8", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
      icon={sorted === "desc" ? ArrowDownIcon : sorted === "asc" ? ArrowUpIcon : ChevronsUpDownIcon}
    >
      {title}
    </Button>
  );
}
