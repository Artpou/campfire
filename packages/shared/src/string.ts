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
