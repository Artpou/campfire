import type { ReactNode } from "react";

import { EmptyState } from "@/shared/components/empty-state";

interface PlaceholderEmptyProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

/** @deprecated Prefer EmptyState directly — kept for discover empty slots. */
export function PlaceholderEmpty({ title, subtitle, action }: PlaceholderEmptyProps) {
  return (
    <div className="w-full flex justify-center py-8">
      <EmptyState title={title ?? "—"} subtitle={subtitle} action={action} />
    </div>
  );
}
