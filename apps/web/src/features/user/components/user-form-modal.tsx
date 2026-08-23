import { useMemo } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { CreateUserInput, UpdateUserInput } from "@seedarr/contracts";
import type { User } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Select } from "@/shared/components/select/select";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useRole } from "@/features/auth/hooks/use-role";
import { ROLE_LABELS, roleConfig } from "@/features/user/components/role-badge";

type UserFormData = CreateUserInput & { confirmPassword: string };

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
}

export function UserFormModal({ open, onClose, user }: UserFormModalProps) {
  const { role: currentUserRole } = useRole();
  const { t } = useLingui();
  const isEditing = !!user;

  const formValues = useMemo<UserFormData>(
    () => ({
      username: user?.username ?? "",
      password: "",
      confirmPassword: "",
      role: user?.role ?? "viewer",
    }),
    [user],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({ values: formValues });

  const selectedRole = watch("role");
  const password = watch("password");

  const createMutation = useMutation({
    mutationFn: (data: CreateUserInput) => unwrap(api.users.$post({ json: data })),
    onSuccess: () => {
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserInput) => {
      if (!user) return Promise.resolve(null);
      return unwrap(api.users[":id"].$put({ param: { id: user.id }, json: data }));
    },
    onSuccess: () => {
      onClose();
    },
  });

  const onSubmit = async (data: UserFormData) => {
    if (isEditing) {
      const updateData: UpdateUserInput = {};
      if (data.username !== user?.username) updateData.username = data.username;
      if (data.password) updateData.password = data.password;
      if (data.role !== user?.role) updateData.role = data.role;

      if (Object.keys(updateData).length > 0) {
        updateMutation.mutate(updateData);
      } else {
        onClose();
      }
    } else {
      createMutation.mutate({
        username: data.username,
        password: data.password,
        role: data.role,
      });
    }
  };

  const availableRoles = () => {
    if (currentUserRole === "owner") {
      return ["admin", "member", "viewer"] as const;
    }
    return ["member", "viewer"] as const;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? <Trans>Edit User</Trans> : <Trans>Create User</Trans>}</DialogTitle>
          <DialogDescription>
            {isEditing ? (
              <Trans>Update user information and permissions</Trans>
            ) : (
              <Trans>Create a new user account with specified role</Trans>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">
              <Trans>Username</Trans>
            </Label>
            <Input
              id="username"
              {...register("username", {
                required: t(msg`Username is required`),
                minLength: { value: 3, message: t(msg`Min 3 characters`) },
              })}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              <Trans>Password</Trans>
              {isEditing && (
                <span className="text-muted-foreground ml-2">
                  (<Trans>leave empty to keep current</Trans>)
                </span>
              )}
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password", {
                required: !isEditing && t(msg`Password is required`),
                minLength: { value: 8, message: t(msg`Min 8 characters`) },
              })}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                <Trans>Confirm Password</Trans>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword", {
                  required: t(msg`Please confirm your password`),
                  validate: (value) => value === password || t(msg`Passwords do not match`),
                })}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
          )}

          {isEditing && watch("password") && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                <Trans>Confirm Password</Trans>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword", {
                  required: watch("password") ? t(msg`Please confirm your password`) : false,
                  validate: (value) => !watch("password") || value === password || t(msg`Passwords do not match`),
                })}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
          )}

          <Select
            value={selectedRole}
            onValueChange={(value) => setValue("role", value as "owner" | "admin" | "member" | "viewer")}
            label={<Trans>Role</Trans>}
            options={availableRoles().map((roleOption) => {
              const RoleIcon = roleConfig[roleOption].icon;
              return {
                value: roleOption,
                label: (
                  <span className="flex items-center gap-2">
                    <RoleIcon className={cn("size-4", roleConfig[roleOption].iconClass)} />
                    {t(ROLE_LABELS[roleOption])}
                  </span>
                ),
              };
            })}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? <Trans>Update</Trans> : <Trans>Create</Trans>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
