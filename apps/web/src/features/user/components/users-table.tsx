import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { Crown, Glasses, Pencil, ShieldCheck, Trash2, UserCheck } from "lucide-react";

import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { useRole } from "@/features/auth/hooks/use-role";
import type { User } from "@/features/user/user.types";

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onRefetch: () => void;
}

const roleConfig = {
  owner: {
    icon: Crown,
    color: "var(--role-owner)",
    bgColor: "oklch(from var(--role-owner) l c h / 0.1)",
  },
  admin: {
    icon: ShieldCheck,
    color: "var(--role-admin)",
    bgColor: "oklch(from var(--role-admin) l c h / 0.1)",
  },
  member: {
    icon: UserCheck,
    color: "var(--role-member)",
    bgColor: "oklch(from var(--role-member) l c h / 0.1)",
  },
  viewer: {
    icon: Glasses,
    color: "var(--role-viewer)",
    bgColor: "oklch(from var(--role-viewer) l c h / 0.1)",
  },
};

export function UsersTable({ users, isLoading, onEditUser, onRefetch }: UsersTableProps) {
  const { role } = useRole();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.user({ id: userId }).delete();
    },
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(navigator.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (isLoading) {
    return <div>Loading...</div>;
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
              users.map((user) => {
                const RoleIcon = roleConfig[user.role].icon;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="gap-1.5"
                        style={{
                          backgroundColor: roleConfig[user.role].bgColor,
                          color: roleConfig[user.role].color,
                        }}
                      >
                        <RoleIcon className="size-3.5" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2 min-h-8 items-center">
                        {canEditUser(user) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onEditUser(user)}
                            className="h-8 gap-2"
                          >
                            <Pencil className="size-3.5" />
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
                            <Trash2 className="size-3.5" />
                            <Trans>Delete</Trans>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={handleDeleteCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Delete User</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                Are you sure you want to delete user "{userToDelete?.username}"? This action cannot
                be undone.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trans>Delete</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
