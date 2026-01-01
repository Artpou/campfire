import { useEffect } from "react";

import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { Crown, Glasses, ShieldCheck, UserCheck } from "lucide-react";
import { useForm } from "react-hook-form";

import { api } from "@/lib/api";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { useRole } from "@/features/auth/hooks/use-role";
import type { User } from "@/features/user/user.types";

interface UserFormData {
  username: string;
  password: string;
  confirmPassword: string;
  role: "owner" | "admin" | "member" | "viewer";
}

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
}

const roleConfig = {
  owner: {
    icon: Crown,
    color: "var(--role-owner)",
  },
  admin: {
    icon: ShieldCheck,
    color: "var(--role-admin)",
  },
  member: {
    icon: UserCheck,
    color: "var(--role-member)",
  },
  viewer: {
    icon: Glasses,
    color: "var(--role-viewer)",
  },
};

export function UserFormModal({ open, onClose, user }: UserFormModalProps) {
  const { role: currentUserRole } = useRole();
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      role: "viewer",
    },
  });

  const selectedRole = watch("role");
  const password = watch("password");

  useEffect(() => {
    if (user) {
      reset({
        username: user.username,
        password: "",
        confirmPassword: "",
        role: user.role,
      });
    } else {
      reset({
        username: "",
        password: "",
        confirmPassword: "",
        role: "viewer",
      });
    }
  }, [user, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      role: "owner" | "admin" | "member" | "viewer";
    }) => {
      await api.user.post(data);
    },
    onSuccess: () => {
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      username?: string;
      password?: string;
      role?: "owner" | "admin" | "member" | "viewer";
    }) => {
      if (!user) return;
      await api.user({ id: user.id }).put(data);
    },
    onSuccess: () => {
      onClose();
    },
  });

  const onSubmit = async (data: UserFormData) => {
    if (isEditing) {
      const updateData: {
        username?: string;
        password?: string;
        role?: "owner" | "admin" | "member" | "viewer";
      } = {};
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

  const SelectedRoleIcon = roleConfig[selectedRole].icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? <Trans>Edit User</Trans> : <Trans>Create User</Trans>}
          </DialogTitle>
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
                required: "Username is required",
                minLength: { value: 3, message: "Min 3 characters" },
              })}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              <Trans>Password</Trans>
              {isEditing && (
                <span className="text-muted-foreground ml-2">(leave empty to keep current)</span>
              )}
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password", {
                required: !isEditing && "Password is required",
                minLength: { value: 8, message: "Min 8 characters" },
              })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
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
                  required: "Please confirm your password",
                  validate: (value) => value === password || "Passwords do not match",
                })}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
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
                  required: watch("password") ? "Please confirm your password" : false,
                  validate: (value) =>
                    !watch("password") || value === password || "Passwords do not match",
                })}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">
              <Trans>Role</Trans>
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(value) =>
                setValue("role", value as "owner" | "admin" | "member" | "viewer")
              }
            >
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <SelectedRoleIcon
                      className="size-4"
                      style={{ color: roleConfig[selectedRole].color }}
                    />
                    {selectedRole}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableRoles().map((roleOption) => {
                  const RoleIcon = roleConfig[roleOption].icon;
                  return (
                    <SelectItem key={roleOption} value={roleOption}>
                      <div className="flex items-center gap-2">
                        <RoleIcon
                          className="size-4"
                          style={{ color: roleConfig[roleOption].color }}
                        />
                        {roleOption}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
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
