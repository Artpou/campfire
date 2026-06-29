import { BadRequestError } from "@/errors/error";
import path from "node:path";

export function getDownloadsRoot(): string {
  return path.resolve(process.env.DOWNLOADS_PATH || "./downloads");
}

export function assertWithinDownloads(resolvedPath: string): void {
  const root = getDownloadsRoot();
  if (resolvedPath !== root && !resolvedPath.startsWith(root + path.sep)) {
    throw new BadRequestError("Path escapes download directory");
  }
}

export function resolveWithinDownloads(...segments: string[]): string {
  const resolved = path.resolve(getDownloadsRoot(), ...segments);
  assertWithinDownloads(resolved);
  return resolved;
}
