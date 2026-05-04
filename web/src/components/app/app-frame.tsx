import type { PropsWithChildren } from "react";

export function AppFrame({ children }: PropsWithChildren) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--color-primary)_10%,transparent),transparent_42%),linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_70%,transparent),transparent_55%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_20%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_20%,transparent)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10 sm:px-10">
        {children}
      </div>
    </main>
  );
}
