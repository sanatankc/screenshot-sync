import { Hand } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { PUBLIC_APP_CONFIG } from "@/lib/public-app-config";

export function IosMessage() {
  return (
    <section className="relative flex min-h-screen w-full items-center overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.07),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(255,255,255,0.035),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_22%)]" />
      <BackgroundBeams className="opacity-12" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          <Hand className="mb-5 size-10 text-foreground" />
          <h1 className="font-[var(--font-display)] text-[2rem] font-bold tracking-[-0.03em] text-foreground">
            This is awkward.
          </h1>
          <p className="mt-5 text-pretty text-[1rem] leading-8 text-muted-foreground">
            Ah, an iPhone user 🫠. {PUBLIC_APP_CONFIG.appName} is for us poor Android users to sync
            screenshots automatically to their computer. 
            <br/>
            Go enjoy your AirDrop &amp; Universal Clipboard, this is for
            us lesser mortals to close the gap.
          </p>
        </div>
      </div>
    </section>
  );
}
