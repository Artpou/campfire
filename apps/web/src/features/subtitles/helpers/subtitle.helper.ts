import type { SubdlSubtitle } from "@seedarr/sdk";
import { sanitizeFileName } from "@seedarr/shared";

import { detectLanguage } from "@/shared/helpers/lang.helper";

function normalizeLanguageCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{2,3}$/.test(upper)) {
    if (upper === "US" || upper === "GB") return "EN";
    return upper.length === 2 ? upper : upper.slice(0, 2);
  }

  const detected = detectLanguage(trimmed);
  const iso2 = detected?.["2"]?.toUpperCase();
  if (!iso2) return null;
  if (iso2 === "EN") return "EN";
  return iso2;
}

function extractLanguageFromFileName(fileName: string, mediaTitle: string): string | null {
  const baseName =
    fileName
      .split("/")
      .pop()
      ?.replace(/\.(srt|vtt)$/i, "") ?? "";
  if (!baseName) return null;

  const safeTitle = sanitizeFileName(mediaTitle);
  const titlePrefix = `${safeTitle}.`;
  if (baseName.toLowerCase().startsWith(titlePrefix.toLowerCase())) {
    return normalizeLanguageCode(baseName.slice(titlePrefix.length));
  }

  const dottedLang = baseName.match(/\.([a-z]{2,3})$/i)?.[1];
  if (dottedLang) return normalizeLanguageCode(dottedLang);

  const wholeName = baseName.match(/^([a-z]{2,3})$/i)?.[1];
  if (wholeName) return normalizeLanguageCode(wholeName);

  return normalizeLanguageCode(baseName);
}

export function collectAddedSubtitleLanguages(
  mediaTitle: string,
  externalPaths: string[],
  torrentFileNames: string[],
): Set<string> {
  const languages = new Set<string>();

  for (const filePath of externalPaths) {
    const language = extractLanguageFromFileName(filePath, mediaTitle);
    if (language) languages.add(language);
  }

  for (const fileName of torrentFileNames) {
    if (!/\.(srt|vtt)$/i.test(fileName)) continue;
    const language = extractLanguageFromFileName(fileName, mediaTitle);
    if (language) languages.add(language);
  }

  return languages;
}

export function isMatchingSubtitleRelease(releaseName: string, mediaTitle: string): boolean {
  return sanitizeFileName(releaseName).toLowerCase() === sanitizeFileName(mediaTitle).toLowerCase();
}

export function sortSubtitlesByTitleMatch(subtitles: SubdlSubtitle[], mediaTitle: string): SubdlSubtitle[] {
  return [...subtitles].sort((left, right) => {
    const leftMatch = isMatchingSubtitleRelease(left.release_name, mediaTitle);
    const rightMatch = isMatchingSubtitleRelease(right.release_name, mediaTitle);
    if (leftMatch === rightMatch) return 0;
    return leftMatch ? -1 : 1;
  });
}
