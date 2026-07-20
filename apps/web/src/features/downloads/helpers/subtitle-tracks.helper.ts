import type { Download } from "@seedarr/sdk";
import { getBaseUrl, withMediaTokenParam } from "@seedarr/sdk";

import { detectLanguage } from "@/shared/helpers/lang.helper";

import { getTorrentFiles } from "@/features/downloads/helpers/downloads.helper";

const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i;

export interface SubtitleTrack {
  kind: "captions";
  label: string;
  srclang: string;
  src: string;
  default: boolean;
}

function extractLangInfo(fileName: string): { label: string; srclang: string } {
  const nameWithoutExt = fileName.replace(/\.(srt|vtt)$/i, "");
  const match2 = nameWithoutExt.match(/\.([a-z]{2})$/i);
  const match3 = nameWithoutExt.match(/\.([a-z]{3})$/i);
  const justCode2 = nameWithoutExt.match(/^([a-z]{2})$/i);
  const justCode3 = nameWithoutExt.match(/^([a-z]{3})$/i);
  const langInput = (match2?.[1] || match3?.[1] || justCode2?.[1] || justCode3?.[1] || nameWithoutExt).toLowerCase();
  const detected = detectLanguage(langInput);
  return {
    label: (detected?.name || nameWithoutExt).slice(0, 20),
    srclang: detected?.[1] ?? "en",
  };
}

export function buildSubtitleTracks(
  download: Download,
  externalPaths: string[],
  mediaToken: string | undefined,
): SubtitleTrack[] {
  const tracks: SubtitleTrack[] = [];
  const id = download.id;

  if (download.torrent?.files) {
    const torrentFiles = getTorrentFiles(download);
    const videoFiles = torrentFiles.filter((f) => VIDEO_EXTENSIONS.test(f.name));
    if (videoFiles.length > 0) {
      const largestVideo = videoFiles.sort((a, b) => b.length - a.length)[0];
      const videoBaseName = largestVideo.name.replace(/\.[^.]+$/, "");

      const subtitleFiles = torrentFiles.filter((f) => {
        const fileName = f.name.toLowerCase();
        if (!fileName.endsWith(".srt") && !fileName.endsWith(".vtt")) return false;
        const fileBaseName = f.name.replace(/\.[^.]+$/, "");
        return fileBaseName.startsWith(videoBaseName) || f.path.includes(largestVideo.path.split("/")[0]);
      });

      for (let i = 0; i < subtitleFiles.length; i++) {
        const file = subtitleFiles[i];
        const fileNameOnly = file.name.split("/").pop() || file.name;
        const { label, srclang } = extractLangInfo(fileNameOnly);
        tracks.push({
          kind: "captions",
          label,
          srclang: `${srclang}-${i}`,
          src: withMediaTokenParam(
            `${getBaseUrl()}/streaming/${id}/subtitles/${encodeURIComponent(file.path)}`,
            mediaToken,
          ),
          default: i === 0 && tracks.length === 0,
        });
      }
    }
  }

  for (let i = 0; i < externalPaths.length; i++) {
    const filePath = externalPaths[i];
    const fileName = filePath.split("/").pop() || filePath;
    const { label } = extractLangInfo(fileName);
    tracks.push({
      kind: "captions",
      label,
      srclang: `ext-${i}`,
      src: withMediaTokenParam(`${getBaseUrl()}/streaming/${id}/subtitles/${encodeURIComponent(filePath)}`, mediaToken),
      default: tracks.length === 0,
    });
  }

  if (tracks.length > 0 && !tracks.some((t) => t.default)) {
    tracks[0].default = true;
  }

  return tracks;
}
