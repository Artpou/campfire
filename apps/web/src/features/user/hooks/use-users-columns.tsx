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
          header: ({ column }) => <DataTableColumnHeader column={column} title={<Trans>Username</Trans>} />,
          cell: ({ row }) => <span className="font-medium">{row.original.pseudo || row.original.username}</span>,
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
                  <Button variant="secondary" size="sm" onClick={() => onEdit(user)} icon={PencilIcon}>
                    <Trans>Edit</Trans>
                  </Button>
                )}
                {canDeleteUser(user) && (
                  <Button variant="destructive" size="sm" onClick={() => onDelete(user)} icon={Trash2Icon}>
                    <Trans>Delete</Trans>
                  </Button>
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
