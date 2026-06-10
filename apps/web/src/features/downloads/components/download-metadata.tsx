import { Badge } from "@/shared/ui/badge";

interface DownloadMetadataProps {
  origin?: string | null;
  quality?: string | null;
  language?: string | null;
  className?: string;
}

export function DownloadMetadata({ origin, quality, language, className = "" }: DownloadMetadataProps) {
  if (!origin && !quality && !language) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {origin && <Badge className="text-xs">{origin}</Badge>}
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
