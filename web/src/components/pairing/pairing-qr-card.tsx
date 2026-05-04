import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PairingQrCardProps = {
  qrValue: string | null;
  workspaceId: string | null;
  statusLabel: string;
  message: string;
  isReady: boolean;
  onRefresh: () => void;
};

export function PairingQrCard({
  qrValue,
  workspaceId,
  statusLabel,
  message,
  isReady,
  onRefresh,
}: PairingQrCardProps) {
  const [colors, setColors] = useState({
    background: "#ece6d8",
    foreground: "#2c2a27",
  });

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const background = styles.getPropertyValue("--card").trim() || colors.background;
    const foreground = styles.getPropertyValue("--primary").trim() || colors.foreground;
    setColors({ background, foreground });
  }, []);

  return (
    <Card className="w-full max-w-md border-border/70 bg-card/92 shadow-2xl shadow-black/10 backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between pb-5">
        <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Pairing
        </span>
        <Badge
          variant="secondary"
          className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          {statusLabel}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="rounded-[calc(var(--radius)*1.8)] border border-border/80 bg-background p-5 shadow-inner shadow-black/5">
          <div className="aspect-square w-full overflow-hidden rounded-[calc(var(--radius)*1.2)] bg-card">
            {qrValue ? (
              <div className="flex h-full items-center justify-center p-4">
                <QRCodeSVG
                  value={qrValue}
                  size={260}
                  bgColor={colors.background}
                  fgColor={colors.foreground}
                  marginSize={2}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-5">
                <Skeleton className="h-full w-full rounded-[calc(var(--radius)*1.2)]" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Workspace</span>
            <span className="truncate font-mono text-sm text-foreground">
              {workspaceId ? workspaceId.slice(0, 8) : "--------"}
            </span>
          </div>
          <Button variant="secondary" size="sm" className="rounded-full" onClick={onRefresh}>
            <RefreshCw data-icon="inline-start" />
            New code
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {isReady ? message : "Preparing session"}
        </div>
      </CardContent>
    </Card>
  );
}
