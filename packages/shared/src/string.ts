export function parseString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const toLatin = (str: string): string | undefined => {
  const sanitized = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s']/g, "")
    .trim();

  if (sanitized.length > 0) {
    return sanitized;
  }

  return undefined;
};

export const slugify = (text: string): string | null => {
  const slug = text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[\x80-\uFFFF]+/g, "");

  if (slug.length > 0) {
    return slug;
  }

  return null;
};

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\?*:|"<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}
