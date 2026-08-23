import { useEffect, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { User } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { UserPlusIcon } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { SentinelStuck, StickyFilterBar } from "@/shared/components/sentinel/sentinel-stuck";
import { Button } from "@/shared/ui/button";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { Input } from "@/shared/ui/input";

import { useRole } from "@/features/auth/hooks/use-role";
import { UserFormModal } from "@/features/user/components/user-form-modal";
import { UsersTable } from "@/features/user/components/users-table";
import { userQueries } from "@/features/user/hooks/user.queries";

const PAGE_SIZE = 20;

export function SettingsUsersView() {
  const { t } = useLingui();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isStuck, setIsStuck] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const { isAdmin } = useRole();

  useEffect(() => {
    setPage(1);
  }, []);

  const { data, isLoading, refetch } = useQuery(
    userQueries.list({ q: debouncedQuery.trim() || undefined, page, limit: PAGE_SIZE }),
  );

  const users = data?.results ?? [];
  const total = data?.total ?? users.length;

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
      classNameWrapper="w-full"
      h="lg"
    />
  );

  return (
    <div className="space-y-4">
      <SentinelStuck setIsStuck={setIsStuck} />
      {!isStuck && searchInput}
      <StickyFilterBar isStuck={isStuck}>
        {isStuck ? (
          <div className="flex w-full items-center gap-2">{searchInput}</div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {isAdmin && (
              <Button onClick={handleCreateUser} icon={UserPlusIcon} className="shrink-0">
                <Trans>Create User</Trans>
              </Button>
            )}
          </div>
        )}
      </StickyFilterBar>

      <DataTablePagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />

      <UsersTable
        users={users}
        isLoading={isLoading}
        onEditUser={handleEditUser}
        onRefetch={refetch}
        empty={
          <EmptyState
            title={<Trans>No users found</Trans>}
            subtitle={<Trans>Try a different search or create a new user.</Trans>}
          />
        }
      />

      <UserFormModal open={isModalOpen} onClose={handleModalClose} user={editingUser} />
    </div>
  );
}
