import { Card, CardContent, CardHeader } from "@/components/ui/card";

type GalleryEmptyStateProps = {
  workspaceId: string;
};

export function GalleryEmptyState({ workspaceId }: GalleryEmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-xl rounded-none border-x-0 border-y border-border/80 bg-transparent shadow-none">
        <CardHeader className="space-y-3 px-6 py-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Workspace {workspaceId.slice(-6)}</p>
          <h2 className="text-2xl tracking-[-0.04em] text-foreground">Waiting for screenshots.</h2>
        </CardHeader>
        <CardContent className="px-6 pb-8 text-sm text-muted-foreground">
          Take a screenshot on your paired phone and it will land here automatically.
        </CardContent>
      </Card>
    </div>
  );
}
