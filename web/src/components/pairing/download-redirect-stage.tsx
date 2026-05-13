import { useEffect, useMemo, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import type { PublicAppConfig } from "@screenshot-sync/contracts";
import { buildGitHubReleasesPageUrl } from "@screenshot-sync/contracts";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import { PUBLIC_APP_CONFIG } from "@/lib/public-app-config";

type GitHubRelease = {
  tag_name: string;
  published_at: string;
  assets?: Array<{
    name?: string;
    browser_download_url?: string;
  }>;
};

async function resolveLatestAndroidApk(config: PublicAppConfig) {
  const response = await fetch(
    `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/releases?per_page=12`,
  );

  if (!response.ok) {
    throw new Error("LATEST_RELEASE_LOOKUP_FAILED");
  }

  const releases = (await response.json()) as GitHubRelease[];

  const matchingAsset = releases
    .filter((release) => release.tag_name?.startsWith(config.androidReleaseTagPrefix))
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .flatMap((release) => release.assets ?? [])
    .find(
      (asset) =>
        asset.name?.startsWith(config.androidApkAssetPrefix) &&
        asset.name?.endsWith(".apk") &&
        asset.browser_download_url,
    );

  if (!matchingAsset?.browser_download_url) {
    throw new Error("LATEST_RELEASE_ASSET_NOT_FOUND");
  }

  return matchingAsset.browser_download_url;
}

export function DownloadRedirectStage() {
  const [error, setError] = useState<string | null>(null);
  const releasesPageUrl = useMemo(
    () => buildGitHubReleasesPageUrl(PUBLIC_APP_CONFIG.githubOwner, PUBLIC_APP_CONFIG.githubRepo),
    [],
  );

  useEffect(() => {
    void (async () => {
      try {
        const nextUrl = await resolveLatestAndroidApk(PUBLIC_APP_CONFIG);
        window.location.replace(nextUrl);
      } catch {
        setError("Could not find the latest Android download automatically.");
      }
    })();
  }, []);

  return (
    <section className="relative flex min-h-screen w-full items-center overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.07),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(255,255,255,0.035),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_22%)]" />
      <BackgroundBeams className="opacity-12" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/[0.08] bg-black/28 p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03]">
            <LoaderCircle className="size-6 animate-spin text-foreground" />
          </div>
          <h1 className="font-[var(--font-display)] text-[2rem] font-bold tracking-[-0.03em] text-foreground">
            Preparing your download
          </h1>
          <p className="mt-4 text-pretty text-[1rem] leading-8 text-muted-foreground">
            We’re looking up the latest {PUBLIC_APP_CONFIG.appName} Android build and redirecting you automatically.
          </p>
          {error ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm leading-6 text-red-200/80">{error}</p>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-full border-white/[0.08] bg-white/[0.02] px-5 text-sm text-foreground hover:bg-white/[0.05]"
              >
                <a href={releasesPageUrl}>
                  <ExternalLink data-icon="inline-start" />
                  Open GitHub Releases
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
