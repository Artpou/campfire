import ffmpeg from "fluent-ffmpeg";

import type { TorrentLanguage, TorrentQuality } from "@/types";
import { PassThrough, Readable } from "node:stream";

/**
 * Convert MKV stream to MP4 using ffmpeg with stream copy (remux without re-encoding)
 * @param inputStream - The input video stream (MKV)
 * @returns A readable stream of the converted MP4 video
 */
export function convertMkvToMp4Stream(inputStream: NodeJS.ReadableStream): NodeJS.ReadableStream {
  const outputStream = new PassThrough();

  const command = ffmpeg(inputStream as Readable)
    .outputFormat("mp4")
    .outputOptions(["-c:v copy", "-c:a copy", "-movflags frag_keyframe+empty_moov+default_base_moof", "-f mp4"])
    .on("error", (err) => {
      outputStream.destroy(err);
    });

  command.pipe(outputStream, { end: true });
  return outputStream;
}

export function getTorrentQuality(title: string): TorrentQuality {
  const t = title.toLowerCase();

  if (t.includes("4k") || t.includes("uhd")) return "4K";

  if (t.includes("2160")) return "2160p";

  if (t.includes("1440")) return "1440p";

  if (t.includes("1080") || t.includes("bluray")) return "1080p";

  if (t.includes("720")) return "720p";

  if (t.includes("480")) return "480p";

  if (t.includes("HD")) return "720p";

  if (t.includes("dvdrip") || t.includes("webrip") || t.includes("dvdcam") || t.includes("bdrip")) {
    return "480p";
  }

  return "";
}

export function getLanguageFromTitle(title: string): TorrentLanguage {
  const t = title.toLowerCase();

  if (t.includes("multi")) return "multi";
  if (t.includes("english")) return "en";
  if (t.includes("french")) return "fr";
  if (t.includes("spanish")) return "es";

  return "";
}
