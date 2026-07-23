import { Progress } from "@/shared/ui/progress";

interface WatchProgressBarProps {
  value: number;
}

export function WatchProgressBar({ value }: WatchProgressBarProps) {
  return (
    <div className="px-1.5 mt-1.5">
      <Progress value={value} variant="white" className="h-1.5 shadow-none" />
    </div>
  );
}
