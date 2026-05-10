import { Skeleton } from "@/components/ui/skeleton";
import { TILE_ASPECT_RATIO } from "@/components/gallery/constants";

export function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="overflow-hidden border border-border">
          <Skeleton className="w-full rounded-none" style={{ aspectRatio: TILE_ASPECT_RATIO }} />
        </div>
      ))}
    </div>
  );
}
