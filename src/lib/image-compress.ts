// Client-side image compression using Canvas. Returns a JPEG Blob.
// Defaults adapt to the device's current network quality (YemenNet / TeleYemen
// often resolves to 2g/3g) so uploads succeed on slow links without us asking
// the user to pick a quality.
import { recommendedUploadParams } from "./net-quality";

export async function compressImage(
  file: File,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<File> {
  const rec = recommendedUploadParams();
  const { maxWidth = rec.maxWidth, maxHeight = rec.maxHeight, quality = rec.quality } = opts;
  if (!file.type.startsWith("image/")) return file;
  // Skip tiny files
  if (file.size < 300 * 1024) return file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("image load failed"));
    i.src = dataUrl;
  });

  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
