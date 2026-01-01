import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { UserFormModal } from "@/features/user/components/user-form-modal";
import { UsersTable } from "@/features/user/components/users-table";
import type { User } from "@/features/user/user.types";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
  beforeLoad: () => {
    const user = useAuth.getState().user;
    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      throw redirect({ to: "/" });
    }
  },
});

function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { isAdmin } = useRole();

  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.user.get();
      return response.data || [];
    },
  });

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
    <Container>
      <div className="space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              <Trans>User Management</Trans>
            </h1>
            <p className="text-muted-foreground">
              <Trans>Manage user accounts and permissions</Trans>
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleCreateUser}>
              <UserPlus className="size-4 mr-2" />
              <Trans>Create User</Trans>
            </Button>
          )}
        </div>

        <UsersTable
          users={users}
          isLoading={isLoading}
          onEditUser={handleEditUser}
          onRefetch={refetch}
        />

        <UserFormModal open={isModalOpen} onClose={handleModalClose} user={editingUser} />
      </div>
    </Container>
  );
}
