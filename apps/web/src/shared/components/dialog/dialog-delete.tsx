import { Trans } from "@lingui/react/macro";

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

interface DialogDeleteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  validate: () => void;
  title: React.ReactNode;
  description: React.ReactNode;
  disabled?: boolean;
  extra?: React.ReactNode;
}

export function DialogDelete({ open, setOpen, validate, title, description, disabled, extra }: DialogDeleteProps) {
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {extra}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>
            <Trans>Cancel</Trans>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={validate}
            disabled={disabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trans>Delete</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
