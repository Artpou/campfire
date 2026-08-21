import { useCallback, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { User } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation } from "@tanstack/react-query";
import { type SortingState, useTable } from "@tanstack/react-table";

import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { DataTable } from "@/shared/ui/data-table";

import { useRole } from "@/features/auth/hooks/use-role";
import { usersTableFeatures, useUsersColumns } from "@/features/user/hooks/use-users-columns";

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onRefetch: () => void;
  empty?: React.ReactNode;
}

export function UsersTable({ users, isLoading, onEditUser, onRefetch, empty }: UsersTableProps) {
  const { role } = useRole();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => unwrap(api.users[":id"].$delete({ param: { id: userId } })),
    onSuccess: () => {
      setUserToDelete(null);
      onRefetch();
    },
  });

  const canEditUser = useCallback(
    (targetUser: User) => {
      if (role === "owner") return targetUser.role !== "owner";
      if (role === "admin") return targetUser.role !== "owner" && targetUser.role !== "admin";
      return false;
    },
    [role],
  );

  const canDeleteUser = useCallback((targetUser: User) => canEditUser(targetUser), [canEditUser]);

  const onDelete = useCallback((user: User) => setUserToDelete(user), []);

  const columns = useUsersColumns({
    canEditUser,
    canDeleteUser,
    onEdit: onEditUser,
    onDelete,
  });

  const table = useTable({
    features: usersTableFeatures,
    data: users,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (isLoading) {
    return (
      <div>
        <Trans>Loading...</Trans>
      </div>
    );
  }

  return (
    <>
      <DataTable table={table} empty={empty ?? <Trans>No users found</Trans>} />

      <DialogDelete
        open={!!userToDelete}
        setOpen={(open) => {
          if (!open) setUserToDelete(null);
        }}
        validate={() => {
          if (userToDelete) deleteMutation.mutate(userToDelete.id);
        }}
        disabled={deleteMutation.isPending}
        title={<Trans>Delete User</Trans>}
        description={
          <Trans>Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.</Trans>
        }
      />
    </>
  );
}
