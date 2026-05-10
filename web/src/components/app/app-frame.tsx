import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type AppFrameProps = PropsWithChildren<{
  centered?: boolean;
}>;

export function AppFrame({ children, centered = false }: AppFrameProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--color-foreground)_2.5%,transparent),transparent_34%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.02]" />
      <div
        className={cn(
          "relative flex min-h-screen w-full",
          centered
            ? "mx-auto max-w-6xl items-center justify-center px-6 py-10 sm:px-10"
            : "items-stretch justify-stretch",
        )}
      >
        {children}
      </div>
    </main>
  );
}
