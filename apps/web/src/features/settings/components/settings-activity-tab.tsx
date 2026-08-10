import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { ActivityLog } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { activityLogQueries } from "@/features/settings/hooks/activity-log.queries";

function getTypeBadgeVariant(type: string): "destructive" | "outline" | "secondary" {
  if (type === "ERROR") return "destructive";
  if (type === "WARNING") return "outline";
  return "secondary";
}

function parseMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function SettingsActivityTab() {
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const { data: logs } = useQuery(activityLogQueries.list());

  const results = logs?.results ?? [];
  const parsedMetadata = selectedLog ? parseMetadata(selectedLog.metadata) : null;

  return (
    <div className="space-y-6">
      <CardHeader>
        <CardTitle>
          <Trans>Activity</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>Recent activity on this instance.</Trans>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {results.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">
                  <Trans>Type</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Title</Trans>
                </TableHead>
                <TableHead className="w-44 text-right">
                  <Trans>Date</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((log) => (
                <TableRow key={log.id} className="group relative cursor-pointer" onClick={() => setSelectedLog(log)}>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(log.type)} className="text-[10px]">
                      {log.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium truncate max-w-0">{log.title}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm relative">
                    {new Date(log.createdAt).toLocaleString()}
                    <div className="absolute inset-y-0 right-0 z-10 flex items-center opacity-0 group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        icon={InfoIcon}
                      >
                        <Trans>Details</Trans>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            <Trans>No activity yet.</Trans>
          </p>
        )}
      </CardContent>

      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {selectedLog && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLog.title}</SheetTitle>
                <SheetDescription>
                  {selectedLog.action} &middot; {new Date(selectedLog.createdAt).toLocaleString()}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    <Trans>Type</Trans>
                  </p>
                  <Badge variant={getTypeBadgeVariant(selectedLog.type)}>{selectedLog.type}</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    <Trans>Action</Trans>
                  </p>
                  <p className="text-sm">{selectedLog.action}</p>
                </div>
                {selectedLog.userId && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      <Trans>User ID</Trans>
                    </p>
                    <p className="text-sm font-mono text-muted-foreground">{selectedLog.userId}</p>
                  </div>
                )}
                {parsedMetadata && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      <Trans>Metadata</Trans>
                    </p>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(parsedMetadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
