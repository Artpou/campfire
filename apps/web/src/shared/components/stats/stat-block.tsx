import type { ReactNode } from "react";

export function StatBlock({
  value,
  label,
  sublabel,
  icon,
}: {
  value: ReactNode;
  label: ReactNode;
  sublabel?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-3">
      <span className="text-xl md:text-2xl font-semibold tracking-tight tabular-nums flex items-center gap-1.5">
        {icon}
        {value}
      </span>
      <span className="text-xs uppercase text-muted-foreground font-medium text-center">{label}</span>
      {sublabel && <span className="text-[10px] text-muted-foreground text-center">{sublabel}</span>}
    </div>
  );
}

export function StatDivider() {
  return <div className="w-px self-stretch bg-border/80" aria-hidden />;
}
