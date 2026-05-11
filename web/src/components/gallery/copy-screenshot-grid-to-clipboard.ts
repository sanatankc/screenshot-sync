const DEFAULT_TILE_WIDTH = 480;
const DEFAULT_TILE_ASPECT = 2.22;
const DEFAULT_GAP = 16;
const MAX_CANVAS_DIMENSION = 4_096;

type CopyScreenshotGridItem = {
  id: string;
  url: string;
};

type LoadedImage = {
  id: string;
  element: ImageBitmap;
  width: number;
  height: number;
};

async function loadImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("COPY_IMAGE_FETCH_FAILED");
  }

  const blob = await response.blob();
  return createImageBitmap(blob);
}

function chooseGrid(imageCount: number, tileAspect: number) {
  let bestColumns = 1;
  let bestRows = imageCount;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let columns = 1; columns <= imageCount; columns += 1) {
    const rows = Math.ceil(imageCount / columns);
    const aspect = columns / (rows * tileAspect);
    const score = Math.abs(Math.log(aspect));

    if (score < bestScore) {
      bestScore = score;
      bestColumns = columns;
      bestRows = rows;
    }
  }

  return { columns: bestColumns, rows: bestRows };
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

export async function copyScreenshotGridToClipboard(items: CopyScreenshotGridItem[]) {
  if (items.length === 0) {
    return;
  }

  const loadedImages: LoadedImage[] = await Promise.all(
    items.map(async (item) => {
      const element = await loadImage(item.url);
      return {
        id: item.id,
        element,
        width: element.width,
        height: element.height,
      };
    }),
  );

  const averageAspect =
    loadedImages.reduce((sum, image) => sum + image.height / image.width, 0) / loadedImages.length || DEFAULT_TILE_ASPECT;

  const { columns, rows } = chooseGrid(loadedImages.length, averageAspect);
  const tileWidth = DEFAULT_TILE_WIDTH;
  const tileHeight = Math.round(tileWidth * averageAspect);
  const gap = DEFAULT_GAP;

  const rawCanvasWidth = columns * tileWidth + Math.max(0, columns - 1) * gap;
  const rawCanvasHeight = rows * tileHeight + Math.max(0, rows - 1) * gap;
  const scale = Math.min(1, MAX_CANVAS_DIMENSION / Math.max(rawCanvasWidth, rawCanvasHeight));

  const scaledTileWidth = Math.max(1, Math.floor(tileWidth * scale));
  const scaledTileHeight = Math.max(1, Math.floor(tileHeight * scale));
  const scaledGap = Math.max(1, Math.floor(gap * scale));
  const canvasWidth = columns * scaledTileWidth + Math.max(0, columns - 1) * scaledGap;
  const canvasHeight = rows * scaledTileHeight + Math.max(0, rows - 1) * scaledGap;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("COPY_IMAGE_CONTEXT_UNAVAILABLE");
  }

  context.fillStyle = "#0f0f10";
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  loadedImages.forEach((image, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = column * (scaledTileWidth + scaledGap);
    const y = row * (scaledTileHeight + scaledGap);

    drawCoverImage(context, image.element, x, y, scaledTileWidth, scaledTileHeight);
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("COPY_IMAGE_BLOB_FAILED"));
        return;
      }

      resolve(result);
    }, "image/png");
  });

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);

  loadedImages.forEach((image) => image.element.close());
}
