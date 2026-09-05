import { Trans } from "@lingui/react/macro";
import type { MediaRequest } from "@seedarr/sdk";
import { BanIcon, CheckIcon, Trash2Icon, UndoDotIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import {
  useCancelRequest,
  useDeleteRequest,
  useReopenRequest,
  useValidateRequest,
} from "@/features/request/hooks/request.queries";

interface RequestActionsProps {
  request: MediaRequest;
}

export function RequestActions({ request }: RequestActionsProps) {
  const { hasRole } = useRole();
  const currentUser = useAuth((s) => s.user);
  const cancelRequest = useCancelRequest();
  const validateRequest = useValidateRequest();
  const reopenRequest = useReopenRequest();
  const deleteRequest = useDeleteRequest();

  const isAdmin = hasRole("admin");
  const isOwner = currentUser?.id === request.userId;
  const status = request.status ?? "pending";

  return (
    <div className="flex items-center gap-1">
      {isAdmin && status === "pending" && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon-sm"
                icon={CheckIcon}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  validateRequest.mutate(request.id);
                }}
                disabled={validateRequest.isPending}
              />
            </TooltipTrigger>
            <TooltipContent>
              <Trans>Validate request</Trans>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon-sm"
                icon={BanIcon}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelRequest.mutate(request.id);
                }}
                disabled={cancelRequest.isPending}
              />
            </TooltipTrigger>
            <TooltipContent>
              <Trans>Cancel request</Trans>
            </TooltipContent>
          </Tooltip>
        </>
      )}

      {status === "cancelled" && isOwner && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon-sm"
              icon={UndoDotIcon}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                reopenRequest.mutate(request.id);
              }}
              disabled={reopenRequest.isPending}
            />
          </TooltipTrigger>
          <TooltipContent>
            <Trans>Reopen request</Trans>
          </TooltipContent>
        </Tooltip>
      )}

      {isOwner && status === "pending" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon-sm"
              icon={Trash2Icon}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteRequest.mutate(request.id);
              }}
              disabled={deleteRequest.isPending}
            />
          </TooltipTrigger>
          <TooltipContent>
            <Trans>Delete request</Trans>
          </TooltipContent>
        </Tooltip>
      )}

      {isOwner && (status === "validated" || status === "cancelled") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              icon={Trash2Icon}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteRequest.mutate(request.id);
              }}
              disabled={deleteRequest.isPending}
            />
          </TooltipTrigger>
          <TooltipContent>
            <Trans>Delete request</Trans>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
