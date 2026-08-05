import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { UserRole } from "@seedarr/contracts";
import type { User } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation } from "@tanstack/react-query";
import { CrownIcon, GlassesIcon, PencilIcon, ShieldCheckIcon, Trash2Icon, UserCheckIcon } from "lucide-react";

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

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onRefetch: () => void;
}

const roleConfig: Record<
  UserRole,
  {
    icon: typeof CrownIcon;
    color: string;
    bgColor: string;
  }
> = {
  owner: {
    icon: CrownIcon,
    color: "var(--red)",
    bgColor: "oklch(from var(--red) l c h / 0.1)",
  },
  admin: {
    icon: ShieldCheckIcon,
    color: "var(--purple)",
    bgColor: "oklch(from var(--purple) l c h / 0.1)",
  },
  member: {
    icon: UserCheckIcon,
    color: "var(--primary)",
    bgColor: "oklch(from var(--primary) l c h / 0.1)",
  },
  viewer: {
    icon: GlassesIcon,
    color: "var(--blue)",
    bgColor: "oklch(from var(--blue) l c h / 0.1)",
  },
};

const ROLE_LABELS: Record<UserRole, ReturnType<typeof msg>> = {
  owner: msg`Owner`,
  admin: msg`Admin`,
  member: msg`Member`,
  viewer: msg`Viewer`,
};

export function UsersTable({ users, isLoading, onEditUser, onRefetch }: UsersTableProps) {
  const { t } = useLingui();
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

  const formatDate = (date: string) => {
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
                        {t(ROLE_LABELS[user.role])}
                      </Badge>
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
                Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.
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
