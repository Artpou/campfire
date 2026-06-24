import type * as React from "react";

import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  label,
  h,
  search,
  ...props
}: React.ComponentProps<"input"> & { label?: React.ReactNode; h?: "default" | "lg"; search?: boolean }) {
  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-input h-9 w-full min-w-0 rounded-md px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-ring/30 hover:ring-ring/20 hover:ring-[3px]",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        !!label && "rounded-tl-none",
        search && "pl-12",
        h === "lg" && "py-5.5",
        className,
      )}
      {...props}
    />
  );

  if (search) {
    return (
      <div className="relative w-full">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
        {input}
      </div>
    );
  }

  if (label) {
    return (
      <div className="flex flex-col">
        <label
          className="text-sm bg-background font-medium border border-input rounded-t-md w-fit px-2 pb-0.5 border-b-0 mb-0"
          htmlFor={props.id}
        >
          {label}
        </label>
        {input}
      </div>
    );
  }

  return input;
}

export { Input };
