import { asc, desc, getTableName, type SQL, sql } from "drizzle-orm";
import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

export function order(expr: SQL, order?: "asc" | "desc"): SQL {
  return order === "asc" ? asc(expr) : desc(expr);
}

/**
 * Qualified `table.column` via identifiers — survives nesting in outer-table
 * orderBy/extras where Drizzle would otherwise remap Column refs to the parent alias.
 */
export function sqlColumn(table: SQLiteTable, column: AnySQLiteColumn | string): SQL {
  const name = typeof column === "string" ? column : column.name;
  return sql`${sql.identifier(getTableName(table))}.${sql.identifier(name)}`;
}

export function isColumn(value: unknown): value is AnySQLiteColumn {
  return typeof value === "object" && value !== null && "name" in value && "table" in value;
}
