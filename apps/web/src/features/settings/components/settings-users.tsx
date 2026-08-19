import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { User } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { UserPlusIcon } from "lucide-react";

import { SentinelStuck, StickyFilterBar } from "@/shared/components/sentinel/sentinel-stuck";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { useRole } from "@/features/auth/hooks/use-role";
import { UserFormModal } from "@/features/user/components/user-form-modal";
import { UsersTable } from "@/features/user/components/users-table";
import { userQueries } from "@/features/user/hooks/user.queries";

export function SettingsUsersTab() {
  const { t } = useLingui();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [isStuck, setIsStuck] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const { isAdmin } = useRole();

  const { data: users = [], isLoading, refetch } = useQuery(userQueries.list(debouncedQuery.trim() || undefined));

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

  const searchInput = (
    <Input
      type="search"
      search
      placeholder={t(msg`Search users…`)}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      classNameWrapper={isStuck ? "hidden lg:block w-full" : "w-full"}
      h={isStuck ? "lg" : undefined}
    />
  );

  return (
    <div className="space-y-4">
      <SentinelStuck setIsStuck={setIsStuck} marginTop={-30} />
      <StickyFilterBar isStuck={isStuck}>
        <div className="flex items-center justify-between gap-2">
          {isAdmin && (
            <Button onClick={handleCreateUser} icon={UserPlusIcon} className="shrink-0">
              <Trans>Create User</Trans>
            </Button>
          )}
          {isStuck ? searchInput : null}
        </div>
      </StickyFilterBar>

      {!isStuck && searchInput}

      <UsersTable users={users ?? []} isLoading={isLoading} onEditUser={handleEditUser} onRefetch={refetch} />

      <UserFormModal open={isModalOpen} onClose={handleModalClose} user={editingUser} />
    </div>
  );
}
