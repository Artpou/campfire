import { Children, cloneElement, isValidElement, type ReactElement } from "react";

import { Slot } from "@radix-ui/react-slot";
import { Link } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { TooltipWrapper } from "@/shared/ui/tooltip-wrapper";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "bg-muted hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/50",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4 [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9",
        "icon-xs": "size-6 rounded-[calc(var(--radius)-3px)] p-0 has-[>svg]:p-0",
        "icon-sm": "size-8",
        "icon-lg": "size-10 [&_svg:not([class*='size-'])]:size-4",
        "icon-xl": "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    to?: React.ComponentProps<typeof Link>["to"];
    tooltip?: React.ReactNode;
    rounded?: boolean;
    /** Lucide icon rendered before children; size follows the button size variant via CSS. */
    icon?: LucideIcon;
    /** When true, shows a spinner and disables the button. */
    loading?: boolean;
  };

function renderIcon(Icon: LucideIcon | undefined, loading: boolean) {
  if (loading) return <Loader2Icon className="animate-spin" />;
  if (Icon) return <Icon />;
  return null;
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  to,
  tooltip,
  rounded = false,
  icon: Icon,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled || loading;
  const classNames = cn(buttonVariants({ variant, size, className }), rounded && "rounded-full");

  let body: React.ReactNode;

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error("Button asChild expects a single React element child");
    }
    const element = child as ReactElement<{ children?: React.ReactNode }>;
    body = cloneElement(
      element,
      undefined,
      <>
        {renderIcon(Icon, loading)}
        {element.props.children}
      </>,
    );
  } else if (to) {
    body = (
      <Link to={to}>
        {renderIcon(Icon, loading)}
        {children}
      </Link>
    );
  } else {
    body = (
      <>
        {renderIcon(Icon, loading)}
        {children}
      </>
    );
  }

  const button = (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={classNames}
      disabled={asChild ? undefined : isDisabled}
      aria-disabled={asChild && isDisabled ? true : undefined}
      {...props}
    >
      {body}
    </Comp>
  );

  return <TooltipWrapper tooltip={tooltip}>{button}</TooltipWrapper>;
}

export { Button, buttonVariants };
