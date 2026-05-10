export async function copyImageToClipboard(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("COPY_IMAGE_FETCH_FAILED");
  }

  const blob = await response.blob();
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type || "image/png"]: blob,
    }),
  ]);
}
