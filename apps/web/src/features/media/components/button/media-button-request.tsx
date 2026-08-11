import { Trans } from "@lingui/react/macro";
import type { MediaInput } from "@seedarr/contracts";
import { BellPlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/shared/ui/button";

import { useCreateRequest } from "@/features/request/hooks/request.queries";

interface MediaButtonRequestProps extends Omit<ButtonProps, "onClick"> {
  media: MediaInput;
}

export function MediaButtonRequest({ media, size, className, ...props }: MediaButtonRequestProps) {
  const { mutate, isPending } = useCreateRequest();

  return (
    <Button
      size={size}
      className={cn(className)}
      onClick={() => mutate(media)}
      disabled={isPending}
      icon={BellPlusIcon}
      {...props}
    >
      <Trans>Request</Trans>
    </Button>
  );
}
