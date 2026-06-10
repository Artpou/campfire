import * as path from "node:path";
import type { Download } from "./download.dto";
import { WebTorrentClient } from "./webtorrent.client";
import { findLargestVideoFile } from "./webtorrent.helper";

export interface StreamResult {
  stream: NodeJS.ReadableStream;
  size: number;
  fileName: string;
  filePath?: string;
}

export class DownloadStreamService {
  constructor(private downloadPath: string) {}

  async getStreamForDownload(download: Download): Promise<StreamResult | undefined> {
    const activeTorrent = WebTorrentClient.getActiveTorrent(download.id);
    if (activeTorrent) {
      const videoFile = findLargestVideoFile(activeTorrent);
      if (!videoFile) return undefined;

      return {
        stream: videoFile.createReadStream(),
        size: videoFile.length,
        fileName: videoFile.name,
        filePath: path.join(activeTorrent.path, videoFile.path),
      };
    }

    return this.getStreamFromDisk(download);
  }

  private async getStreamFromDisk(download: Download): Promise<StreamResult | undefined> {
    if (download.status === "failed") return undefined;

    const fullPath = this.getFullPath(download);
    const fs = await import("node:fs/promises");
    const fsSync = await import("node:fs");
    const videoExtensions = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i;

    try {
      const stats = await fs.stat(fullPath);

      if (stats.isFile()) {
        const fileName = path.basename(fullPath);
        if (!videoExtensions.test(fileName)) return undefined;
        return {
          stream: fsSync.createReadStream(fullPath),
          size: stats.size,
          fileName,
          filePath: fullPath,
        };
      }

      const files = await fs.readdir(fullPath, { recursive: true, withFileTypes: true });
      const videoFiles = await Promise.all(
        files
          .filter((file) => file.isFile() && videoExtensions.test(file.name))
          .map(async (file) => {
            const filePath = path.join(file.parentPath || fullPath, file.name);
            const fileStats = await fs.stat(filePath);
            return { path: filePath, name: file.name, size: fileStats.size };
          }),
      );

      if (videoFiles.length === 0) return undefined;
      const largestVideo = videoFiles.sort((a, b) => b.size - a.size)[0];
      return {
        stream: fsSync.createReadStream(largestVideo.path),
        size: largestVideo.size,
        fileName: largestVideo.name,
        filePath: largestVideo.path,
      };
    } catch {
      return undefined;
    }
  }

  private getFullPath(download: Download, relativePath?: string): string {
    const basePath = path.join(this.downloadPath, download.savePath || download.name);
    return relativePath ? path.join(basePath, relativePath) : basePath;
  }
}
