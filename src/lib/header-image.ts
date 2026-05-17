import { HEADER_IMAGE_SPEC } from "./header-image-spec";

export { HEADER_IMAGE_SPEC } from "./header-image-spec";

export function validateHeaderImageDimensions(
  width: number,
  height: number,
): string | null {
  const { minWidth, minHeight } = HEADER_IMAGE_SPEC;

  if (width < minWidth || height < minHeight) {
    return `الصورة صغيرة جداً. الحد الأدنى ${minWidth}×${minHeight} بكسل (الحالية ${width}×${height}).`;
  }

  return null;
}

function isHeicFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

/** تحويل HEIC (آيفون) إلى JPEG قبل المعالجة */
async function normalizeImageFile(file: File): Promise<Blob> {
  if (!isHeicFile(file)) return file;

  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!blob) throw new Error("empty");
    return blob;
  } catch {
    throw new Error(
      "صيغة HEIC غير مدعومة في هذا المتصفح. صدّر الصورة كـ JPG من الألبوم أو استخدم Safari.",
    );
  }
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:")) resolve(result);
      else reject(new Error("read failed"));
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function imageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = src;
  });
}

type DecodedImage = { width: number; height: number; draw: (ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number) => void };

async function decodeImageFile(file: File): Promise<DecodedImage> {
  const blob = await normalizeImageFile(file);

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, dx, dy, dw, dh) => {
          ctx.drawImage(bitmap, dx, dy, dw, dh);
          bitmap.close();
        },
      };
    } catch {
      /* جرّب الطرق التالية */
    }
  }

  const trySrc = async (src: string) => {
    const img = await imageFromSrc(src);
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number) => {
        ctx.drawImage(img, dx, dy, dw, dh);
      },
    };
  };

  try {
    return await trySrc(await readFileAsDataUrl(blob));
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      return await trySrc(url);
    } catch {
      throw new Error(
        "تعذّر قراءة الصورة. جرّب JPG أو PNG، أو صدّر من الآيفون كـ «الأكثر توافقاً».",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** قصّ وتصغير الصورة لبانر الهيدر */
export async function processHeaderImageFile(file: File): Promise<string> {
  const decoded = await decodeImageFile(file);

  const err = validateHeaderImageDimensions(decoded.width, decoded.height);
  if (err) throw new Error(err);

  const outW = HEADER_IMAGE_SPEC.recommendedWidth;
  const outH = HEADER_IMAGE_SPEC.recommendedHeight;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر معالجة الصورة");

  ctx.fillStyle = "#f5f0e6";
  ctx.fillRect(0, 0, outW, outH);

  const scale = Math.min(outW / decoded.width, outH / decoded.height);
  const drawW = decoded.width * scale;
  const drawH = decoded.height * scale;
  const dx = (outW - drawW) / 2;
  const dy = (outH - drawH) / 2;

  decoded.draw(ctx, dx, dy, drawW, drawH);

  try {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    if (!dataUrl.startsWith("data:image/")) throw new Error("encode failed");
    return dataUrl;
  } catch {
    throw new Error("تعذّر حفظ الصورة بعد المعالجة");
  }
}
