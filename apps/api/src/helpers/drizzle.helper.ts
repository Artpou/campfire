import { AnyColumn, sql, Table } from "drizzle-orm";

/**
 * Generate a type-safe subquery for the 'extras' block of Drizzle.
 */
export function countSubquery<TName extends string>(
  targetTable: Table, // The table to count (ex: userLikes)
  foreignKey: AnyColumn, // The foreign key (ex: userLikes.mediaId)
  localId: AnyColumn, // The primary table ID (ex: fields.id)
  alias: TName, // The output field name (ex: "likes")
) {
  return sql<number>`(
    SELECT count(*) 
    FROM ${targetTable} 
    WHERE ${foreignKey} = ${localId}
  )`
    .mapWith(Number)
    .as(alias);
}
