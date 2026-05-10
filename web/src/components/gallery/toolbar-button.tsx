import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToolbarButtonProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  className?: string;
};

export function ToolbarButton({ children, onClick, disabled = false, tone = "default", className }: ToolbarButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        tone === "danger"
          ? "h-16 rounded-none border-l border-border bg-transparent px-5 text-[11px] uppercase tracking-[0.2em] text-red-200/80 shadow-none hover:bg-red-500/8 hover:text-red-100"
          : "h-16 rounded-none border-l border-border bg-transparent px-5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground shadow-none hover:bg-foreground/[0.03] hover:text-foreground",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
