import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";

interface DownloadMetadataProps {
  origin?: string | null;
  quality?: string | null;
  language?: string | null;
  className?: string;
}

export function DownloadMetadata({ origin, quality, language, className }: DownloadMetadataProps) {
  if (!origin && !quality && !language) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {origin && (
        <Badge variant="outline" className="text-xs">
          {origin}
        </Badge>
      )}
      {quality && (
        <Badge variant="outline" className="text-xs">
          {quality}
        </Badge>
      )}
      {language && (
        <Badge variant="outline" className="text-xs">
          {language}
        </Badge>
      )}
    </div>
  );
}
