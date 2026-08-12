import type { MouseEvent } from "react";

export const handleSafeClick = (e: MouseEvent<HTMLButtonElement | HTMLDivElement>, func: () => void) => {
  const target = e.target as HTMLElement;
  if (target.closest("button, a, [role='button'], input, textarea")) return;
  func();
};
