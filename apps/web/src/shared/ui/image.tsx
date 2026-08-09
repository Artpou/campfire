import { useState } from "react";

import { cn } from "@/lib/utils";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function Img({ fallback, className, src, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error || !src || src === "") {
    if (!fallback) return null;
    return <div className={cn("size-full flex items-center justify-center", className)}>{fallback}</div>;
  }

  return <img src={src} className={className} onError={() => setError(true)} alt="" {...props} />;
}
