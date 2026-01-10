export const sanitizeToLatinWithApostrophe = (str: string): string | undefined => {
  const sanitized = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (sanitized.length > 0) {
    return sanitized;
  }

  return undefined;
};
