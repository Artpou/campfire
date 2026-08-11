import { useRef, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { FileIcon, UploadIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

interface FileDropzoneProps {
  id?: string;
  accept?: string;
  maxSizeBytes?: number;
  disabled?: boolean;
  value?: File | null;
  onChange: (file: File | null) => void;
  className?: string;
  /** Shown when empty. */
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

export function FileDropzone({
  id = "file-dropzone",
  accept,
  maxSizeBytes,
  disabled,
  value,
  onChange,
  className,
  label,
  hint,
}: FileDropzoneProps) {
  const { t } = useLingui();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File): boolean => {
    setError(null);
    if (accept) {
      const accepted = accept.split(",").map((s) => s.trim().toLowerCase());
      const nameOk = accepted.some((a) => {
        if (a.startsWith(".")) return file.name.toLowerCase().endsWith(a);
        if (a.endsWith("/*")) return file.type.startsWith(a.slice(0, -1));
        return file.type === a || file.name.toLowerCase().endsWith(a.replace("application/", "."));
      });
      const zipFallback =
        accept.includes(".zip") &&
        (file.name.toLowerCase().endsWith(".zip") ||
          file.type === "application/zip" ||
          file.type === "application/x-zip-compressed");
      if (!nameOk && !zipFallback) {
        setError(t`Invalid file type`);
        return false;
      }
    }
    if (maxSizeBytes != null && file.size > maxSizeBytes) {
      setError(t`File is too large`);
      return false;
    }
    return true;
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!validate(file)) {
      onChange(null);
      return;
    }
    onChange(file);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          if (disabled) return;
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        <UploadIcon className="size-6 text-muted-foreground" />
        <div className="text-sm font-medium">{label ?? <Trans>Click or drag a file here</Trans>}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {value && (
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
          <FileIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate flex-1">{value.name}</span>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            icon={XIcon}
            aria-label={t`Remove file`}
            onClick={() => {
              setError(null);
              onChange(null);
            }}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
