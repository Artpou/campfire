import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import type { User } from "@seedarr/sdk";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { DataTableColumnHeader } from "@/shared/ui/data-table-column-header";

import { RoleBadge } from "@/features/user/components/role-badge";
import { UserProfile } from "@/features/user/components/user-profile";

export const usersTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

type UsersTableFeatures = typeof usersTableFeatures;

const columnHelper = createColumnHelper<UsersTableFeatures, User>();

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat(navigator.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

interface UseUsersColumnsOptions {
  canEditUser: (user: User) => boolean;
  canDeleteUser: (user: User) => boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function useUsersColumns({ canEditUser, canDeleteUser, onEdit, onDelete }: UseUsersColumnsOptions) {
  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.pseudo || row.username, {
          id: "username",
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>User</Trans>} />,
          cell: ({ row }) => <UserProfile user={row.original} size="sm" />,
          sortFn: "text",
        }),
        columnHelper.accessor("role", {
          id: "role",
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>Role</Trans>} />,
          cell: ({ row }) => <RoleBadge role={row.original.role} />,
          sortFn: "text",
        }),
        columnHelper.accessor((row) => new Date(row.createdAt).getTime(), {
          id: "createdAt",
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>Created At</Trans>} />,
          cell: ({ row }) => formatDate(row.original.createdAt),
        }),
        columnHelper.display({
          id: "actions",
          meta: { headerClassName: "text-right", cellClassName: "text-right" },
          cell: ({ row }) => {
            const user = row.original;
            return (
              <div className="flex justify-end gap-2 min-h-8 items-center">
                {canEditUser(user) && (
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    icon={PencilIcon}
                    tooltip={<Trans>Edit</Trans>}
                    aria-label="Edit"
                    onClick={() => onEdit(user)}
                  />
                )}
                {canDeleteUser(user) && (
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    icon={Trash2Icon}
                    tooltip={<Trans>Delete</Trans>}
                    aria-label="Delete"
                    onClick={() => onDelete(user)}
                  />
                )}
              </div>
            );
          },
          enableSorting: false,
        }),
      ]),
    [canEditUser, canDeleteUser, onEdit, onDelete],
  );
}
