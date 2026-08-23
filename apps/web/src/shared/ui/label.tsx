import type * as React from "react";
import type { ReactNode } from "react";

import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "flex items-center gap-2 text-xs leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "",
        secondary: "font-semibold uppercase tracking-wide text-muted-foreground",
      },
      size: {
        default: "text-xs",
        sm: "text-[10px]",
        lg: "text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>;

function Label({ className, variant = "default", size = "default", ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root data-slot="label" className={cn(labelVariants({ variant, size, className }))} {...props} />
  );
}

interface LabelWrapperProps {
  label?: ReactNode;
  icon?: LucideIcon;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

function LabelWrapper({ label, icon: Icon, htmlFor, className, children }: LabelWrapperProps) {
  if (!label) return children;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        {label}
      </Label>
      {children}
    </div>
  );
}

export { Label, LabelWrapper };
