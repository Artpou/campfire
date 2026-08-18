import type * as React from "react";
import { useState } from "react";

import { EyeIcon, EyeOffIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";

interface InputProps extends React.ComponentProps<"input"> {
  label?: React.ReactNode;
  classNameWrapper?: string;
  h?: "default" | "lg";
  search?: boolean;
  /** Password field with reveal toggle (overrides type="password"). */
  password?: boolean;
}

function Input({ className, classNameWrapper, type, label, h, search, password, ...props }: InputProps) {
  const [revealed, setRevealed] = useState(false);
  const inputType = password ? (revealed ? "text" : "password") : type;

  const input = (
    <input
      type={inputType}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-input h-9 w-full min-w-0 rounded-md px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-ring/30 hover:ring-ring/20 hover:ring-[3px]",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        !!label && "rounded-tl-none",
        search && "pl-12",
        password && "pr-10",
        h === "lg" && "py-5.5",
        className,
      )}
      {...props}
    />
  );

  const field = password ? (
    <div className="relative w-full">
      {input}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full w-9 text-muted-foreground hover:text-foreground"
        onClick={() => setRevealed((v) => !v)}
        aria-label={revealed ? "Hide" : "Show"}
        icon={revealed ? EyeOffIcon : EyeIcon}
      />
    </div>
  ) : (
    input
  );

  if (search) {
    return (
      <div className={cn("relative w-full", classNameWrapper)}>
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        {field}
      </div>
    );
  }

  if (label) {
    return (
      <div className={cn("space-y-1", classNameWrapper)}>
        <Label htmlFor={props.id}>{label}</Label>
        {field}
      </div>
    );
  }

  return field;
}

export { Input };
