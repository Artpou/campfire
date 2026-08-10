import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { User } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation } from "@tanstack/react-query";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { useRole } from "@/features/auth/hooks/use-role";
import { RoleBadge } from "@/features/user/components/role-badge";

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onRefetch: () => void;
}

export function UsersTable({ users, isLoading, onEditUser, onRefetch }: UsersTableProps) {
  const { role } = useRole();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => unwrap(api.users[":id"].$delete({ param: { id: userId } })),
    onSuccess: () => {
      setUserToDelete(null);
      onRefetch();
    },
  });

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const handleDeleteCancel = () => {
    setUserToDelete(null);
  };

  const canEditUser = (targetUser: User) => {
    if (role === "owner") return targetUser.role !== "owner";
    if (role === "admin") return targetUser.role !== "owner" && targetUser.role !== "admin";
    return false;
  };

  const canDeleteUser = (targetUser: User) => {
    return canEditUser(targetUser);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat(navigator.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div>
        <Trans>Loading...</Trans>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Trans>Username</Trans>
              </TableHead>
              <TableHead>
                <Trans>Role</Trans>
              </TableHead>
              <TableHead>
                <Trans>Created At</Trans>
              </TableHead>
              <TableHead className="text-right">
                <Trans>Actions</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  <Trans>No users found</Trans>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.pseudo || user.username}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2 min-h-8 items-center">
                      {canEditUser(user) && (
                        <Button variant="secondary" size="sm" onClick={() => onEditUser(user)} className="h-8 gap-2">
                          <PencilIcon className="size-3.5" />
                          <Trans>Edit</Trans>
                        </Button>
                      )}
                      {canDeleteUser(user) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                          className="h-8 gap-2"
                        >
                          <Trash2Icon className="size-3.5" />
                          <Trans>Delete</Trans>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DialogDelete
        open={!!userToDelete}
        setOpen={handleDeleteCancel}
        validate={handleDeleteConfirm}
        disabled={deleteMutation.isPending}
        title={<Trans>Delete User</Trans>}
        description={
          <Trans>Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.</Trans>
        }
      />
    </>
  );
}
