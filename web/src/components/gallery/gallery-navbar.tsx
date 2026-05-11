import { Copy, Trash2, Unplug } from "lucide-react";
import { ToolbarButton } from "@/components/gallery/toolbar-button";

type GalleryNavbarProps = {
  selectedCount: number;
  canCopySelection: boolean;
  onCopySelection: () => void;
  onDeleteSelection: () => void;
  onDisconnect: () => void;
};

export function GalleryNavbar({
  selectedCount,
  canCopySelection,
  onCopySelection,
  onDeleteSelection,
  onDisconnect,
}: GalleryNavbarProps) {
  return (
    <header className="flex h-16 w-full items-center border-b border-white/[0.06] bg-background/88 shadow-[0_1px_0_rgba(255,255,255,0.02),0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-1.5 px-5">
        <img src="/logo.svg" alt="Captr" className="size-9 shrink-0" />
        <div className="font-[var(--font-brand)] text-[18.5px] font-semibold leading-none tracking-[-0.07em] text-foreground">Captr</div>
      </div>

      {selectedCount > 0 ? (
        <div className="ml-6 flex items-center border-l border-border">
          <ToolbarButton onClick={onCopySelection} disabled={!canCopySelection} className="bg-transparent">
            <Copy data-icon="inline-start" />
            {selectedCount > 1 ? `Copy ${selectedCount} Images as 1` : "Copy Image"}
          </ToolbarButton>
          <ToolbarButton onClick={onDeleteSelection} tone="danger" className="bg-transparent">
            <Trash2 data-icon="inline-start" />
            Delete
          </ToolbarButton>
        </div>
      ) : null}

      <div className="ml-auto flex items-center border-l border-border">
        <ToolbarButton onClick={onDisconnect} tone="danger" className="bg-transparent">
          <Unplug data-icon="inline-start" />
          Disconnect
        </ToolbarButton>
      </div>
    </header>
  );
}
