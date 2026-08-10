import { Trans } from "@lingui/react/macro";
import type { MediaInput } from "@seedarr/contracts";
import { BellPlusIcon } from "lucide-react";

import { Button, type ButtonProps } from "@/shared/ui/button";

import { useCreateRequest } from "@/features/request/hooks/request.queries";

interface MediaButtonRequestProps {
  media: MediaInput;
  size?: ButtonProps["size"];
  className?: string;
}

export function MediaButtonRequest({ media, size, className }: MediaButtonRequestProps) {
  const { mutate, isPending } = useCreateRequest();

  return (
    <Button size={size} className={className} onClick={() => mutate(media)} disabled={isPending} icon={BellPlusIcon}>
      <Trans>Request</Trans>
    </Button>
  );
}
