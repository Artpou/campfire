import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { pageCount } from "@seedarr/contracts";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

export type DataTablePaginationProps = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Optional label override for the left side (defaults to Page X / Y (N)). */
  label?: ReactNode;
};

export function DataTablePagination({ page, limit, total, onPageChange, className, label }: DataTablePaginationProps) {
  const pages = pageCount(total, limit);
  const current = Math.min(Math.max(1, page), pages);
  const canPrev = current > 1;
  const canNext = current < pages;

  return (
    <div className={`flex items-center justify-between gap-4 ${className ?? ""}`}>
      <p className="text-sm text-muted-foreground">
        {label ?? (
          <Trans>
            Page {current} / {pages} ({total})
          </Trans>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          disabled={!canPrev}
          aria-label="Previous page"
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          disabled={!canNext}
          aria-label="Next page"
          onClick={() => onPageChange(current + 1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
