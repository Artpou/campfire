import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface SentinelStuckProps {
  setIsStuck: (isStuck: boolean) => void;
  marginTop?: number;
}

export function SentinelStuck({ setIsStuck, marginTop = 0 }: SentinelStuckProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: [1], rootMargin: `${String(marginTop)}px 0px 0px 0px` },
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [setIsStuck, marginTop]);

  return <div ref={sentinelRef} className="h-4" aria-hidden />;
}

interface StickyFilterBarProps {
  isStuck: boolean;
  children: React.ReactNode;
  className?: string;
}

export function StickyFilterBar({ isStuck, children, className }: StickyFilterBarProps) {
  return (
    <div
      className={cn("sticky top-14 z-20 flex flex-col bg-background/80 backdrop-blur-md", isStuck && "py-2", className)}
    >
      {children}
    </div>
  );
}
