import type { ReactNode } from "react";

import { Badge } from "@/shared/ui/badge";

interface OnboardingLayoutProps {
  children: ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="bg-background relative min-h-svh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_0%_0%,oklch(0.63_0.13_135_/_0.28),transparent_60%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: "radial-gradient(oklch(1 0 0 / 0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative grid min-h-svh lg:grid-cols-3">
        <aside className="hidden flex-col justify-center items-end px-10 py-12 lg:flex">
          <div className="flex flex-col items-center max-w-sm space-y-5 pb-20">
            <img
              src="/logo.svg"
              alt=""
              width={72}
              height={72}
              className="size-30 drop-shadow-[0_0_28px_oklch(0.63_0.13_135/0.55)]"
            />
            <h1 className="text-4xl font-extrabold">Seedarr</h1>
            <span className="text-popover-foreground leading-relaxed text-center">
              Your self-hosted media center — discover, download, and stream from one place.
            </span>
            <div className="flex gap-2">
              <Badge>Open source</Badge>
              <Badge variant="outline">Self-hosted</Badge>
              <Badge variant="outline">beta</Badge>
            </div>
          </div>
        </aside>

        <section className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:col-span-2 lg:px-16">
          <div className="mb-8 flex flex-col items-start gap-2 lg:hidden">
            <img
              src="/logo.svg"
              alt=""
              width={40}
              height={40}
              className="size-10 drop-shadow-[0_0_20px_oklch(0.63_0.13_135_/_0.5)]"
            />
            <span className="text-xl font-bold">Seedarr</span>
          </div>
          <div className="mx-auto w-full max-w-xl space-y-8">{children}</div>
        </section>
      </div>
    </div>
  );
}
