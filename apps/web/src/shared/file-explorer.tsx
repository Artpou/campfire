import { ChevronRight, File, Folder, Home } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

export interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: string | undefined;
}

export interface FileExplorerProps {
  files: FileItem[];
  currentPath: string;
  isLoading?: boolean;
  onNavigate: (path: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export function FileExplorer({
  files,
  currentPath,
  isLoading = false,
  onNavigate,
}: FileExplorerProps) {
  // Sort: directories first, then files, alphabetically
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const pathParts = currentPath.split("/").filter(Boolean);

  const navigateTo = (path: string) => {
    onNavigate(path.endsWith("/") ? path : `${path}/`);
  };

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath.endsWith("/")
      ? `${currentPath}${folderName}/`
      : `${currentPath}/${folderName}/`;
    onNavigate(newPath);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      onNavigate(parts.length === 0 ? "/" : `/${parts.join("/")}/`);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              className="cursor-pointer flex items-center gap-1"
              onClick={() => navigateTo("/")}
            >
              <Home className="size-4" />
              Root
            </BreadcrumbLink>
          </BreadcrumbItem>
          {pathParts.map((part, index) => {
            const isLast = index === pathParts.length - 1;
            const pathUpToHere = `/${pathParts.slice(0, index + 1).join("/")}/`;

            return (
              <span key={pathUpToHere} className="flex items-center gap-1.5">
                <BreadcrumbSeparator>
                  <ChevronRight className="size-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{part}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => navigateTo(pathUpToHere)}
                    >
                      {part}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              ["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4", "skeleton-5"].map((key) => (
                <TableRow key={key}>
                  <TableCell>
                    <Skeleton className="h-5 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : sortedFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  {currentPath === "/" ? "No files found" : "This folder is empty"}
                </TableCell>
              </TableRow>
            ) : (
              sortedFiles.map((file) => (
                <TableRow
                  key={file.name}
                  className={file.type === "directory" ? "cursor-pointer" : ""}
                  onClick={() => {
                    if (file.type === "directory") {
                      navigateToFolder(file.name);
                    }
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {file.type === "directory" ? (
                        <Folder className="size-4 text-blue-500" />
                      ) : (
                        <File className="size-4 text-muted-foreground" />
                      )}
                      <span className={file.type === "directory" ? "font-medium" : ""}>
                        {file.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {file.type === "directory" ? "-" : formatSize(file.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{file.modifiedAt ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {currentPath !== "/" && (
        <Button variant="outline" onClick={navigateUp} className="w-fit">
          Go Back
        </Button>
      )}
    </div>
  );
}
