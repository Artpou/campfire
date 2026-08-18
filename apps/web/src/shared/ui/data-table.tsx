import type { Cell, ReactTable, Row, RowData, TableFeatures } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

export interface DataTableColumnMeta {
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<TFeatures extends TableFeatures, TData extends RowData> {
  table: ReactTable<TFeatures, TData>;
  empty?: React.ReactNode;
  className?: string;
  classNameContainer?: string;
  onRowClick?: (row: Row<TFeatures, TData>) => void;
  getRowClassName?: (row: Row<TFeatures, TData>) => string | undefined;
}

function getColumnMeta(columnDef: { meta?: unknown }): DataTableColumnMeta | undefined {
  return columnDef.meta as DataTableColumnMeta | undefined;
}

export function DataTable<TFeatures extends TableFeatures, TData extends RowData>({
  table,
  empty,
  className,
  classNameContainer,
  onRowClick,
  getRowClassName,
}: DataTableProps<TFeatures, TData>) {
  const columns = table.getAllColumns();

  return (
    <Table className={className} classNameContainer={classNameContainer}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className={getColumnMeta(header.column.columnDef)?.headerClassName}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={"getIsSelected" in row && row.getIsSelected() ? "selected" : undefined}
              className={cn(onRowClick && "cursor-pointer", getRowClassName?.(row))}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {row.getAllCells().map((cell: Cell<TFeatures, TData, unknown>) => (
                <TableCell key={cell.id} className={getColumnMeta(cell.column.columnDef)?.cellClassName}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
