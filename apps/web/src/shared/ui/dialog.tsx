"use client";

import * as React from "react";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

const DialogResponsiveContext = React.createContext(false);

function useDialogIsMobile(): boolean {
  return React.useContext(DialogResponsiveContext);
}

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const isMobile = useIsMobile();

  return (
    <DialogResponsiveContext.Provider value={isMobile}>
      {isMobile ? <Drawer data-slot="dialog" {...props} /> : <DialogPrimitive.Root data-slot="dialog" {...props} />}
    </DialogResponsiveContext.Provider>
  );
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const isMobile = useDialogIsMobile();
  if (isMobile) return <DrawerTrigger data-slot="dialog-trigger" {...props} />;
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const isMobile = useDialogIsMobile();
  if (isMobile) return <DrawerClose data-slot="dialog-close" {...props} />;
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const isMobile = useDialogIsMobile();

  if (isMobile) {
    return (
      <DrawerContent
        data-slot="dialog-content"
        className={cn("max-h-[90dvh] gap-0", className)}
        {...(props as React.ComponentProps<typeof DrawerContent>)}
      >
        <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-1 space-y-4">
          {children}
        </div>
        {showCloseButton && (
          <DrawerClose
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DrawerClose>
        )}
      </DrawerContent>
    );
  }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none lg:max-w-4xl",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const isMobile = useDialogIsMobile();
  if (isMobile) {
    return <DrawerHeader className={cn("text-left p-0 pb-2", className)} {...props} />;
  }
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const isMobile = useDialogIsMobile();
  if (isMobile) {
    return <DrawerFooter className={cn("p-0 pt-2", className)} {...props} />;
  }
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const isMobile = useDialogIsMobile();
  if (isMobile) {
    return <DrawerTitle className={cn("text-lg font-semibold", className)} {...props} />;
  }
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const isMobile = useDialogIsMobile();
  if (isMobile) {
    return <DrawerDescription className={className} {...props} />;
  }
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
