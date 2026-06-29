import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { User } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { UserPlusIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { useRole } from "@/features/auth/hooks/use-role";
import { UserFormModal } from "@/features/user/components/user-form-modal";
import { UsersTable } from "@/features/user/components/users-table";
import { userQueries } from "@/features/user/hooks/user.queries";

export function SettingsUsersTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { isAdmin } = useRole();

  const { data: users = [], isLoading, refetch } = useQuery(userQueries.list());

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            <Trans>User Management</Trans>
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans>Manage user accounts and permissions</Trans>
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreateUser}>
            <UserPlusIcon className="size-4" />
            <Trans>Create User</Trans>
          </Button>
        )}
      </div>

      <UsersTable users={users ?? []} isLoading={isLoading} onEditUser={handleEditUser} onRefetch={refetch} />

      <UserFormModal open={isModalOpen} onClose={handleModalClose} user={editingUser} />
    </div>
  );
}
