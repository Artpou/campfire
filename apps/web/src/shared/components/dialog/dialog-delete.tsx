import { Trans } from "@lingui/react/macro";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@radix-ui/react-alert-dialog";

import { AlertDialogFooter, AlertDialogHeader } from "@/shared/ui/alert-dialog";

interface DialogDeleteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  validate: () => void;
  title: React.ReactNode;
  description: React.ReactNode;
}
export function DialogDelete({ open, setOpen, validate, title, description }: DialogDeleteProps) {
  return (
    <AlertDialog open={!!open} onOpenChange={(value) => setOpen(value)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>
            <Trans>Annuler</Trans>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={validate}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trans>Supprimer</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
