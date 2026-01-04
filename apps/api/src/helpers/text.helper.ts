export const slugify = (text: string): string | null => {
  const slug = text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .trim()
    .replace(/[\x80-\uFFFF]+/g, ""); // remove any non-ASCII characters

  if (slug.length > 0) {
    return slug;
  }

  return null;
};
