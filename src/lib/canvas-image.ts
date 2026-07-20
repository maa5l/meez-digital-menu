export type ImageOutputSpec = {
  recommendedWidth: number;
  recommendedHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  jpegQuality: number;
  fillColor?: string;
};

type DecodedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number) => void;
  dispose?: () => void;
};

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

function drawImageCover(
  decoded: DecodedImage,
  ctx: CanvasRenderingContext2D,
  outW: number,
  outH: number,
  fillColor: string,
): void {
  ctx.fillStyle = fillColor;
  ctx.fillRect(0, 0, outW, outH);

  const coverScale = Math.max(outW / decoded.width, outH / decoded.height);
  const isSmallerThanOutput = decoded.width < outW && decoded.height < outH;
  const scale = isSmallerThanOutput ? Math.min(coverScale, 1) : coverScale;
  const drawW = decoded.width * scale;
  const drawH = decoded.height * scale;
  const dx = (outW - drawW) / 2;
  const dy = (outH - drawH) / 2;
  decoded.draw(ctx, dx, dy, drawW, drawH);
}

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
        },
        dispose: () => bitmap.close(),
      };
    } catch {
      /* fallback */
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

export function validateImageDimensions(
  width: number,
  height: number,
  spec: Pick<ImageOutputSpec, "minWidth" | "minHeight" | "maxWidth" | "maxHeight">,
): string | null {
  if (width < spec.minWidth || height < spec.minHeight) {
    return `الصورة صغيرة جداً. الحد الأدنى ${spec.minWidth}×${spec.minHeight} بكسل (الحالية ${width}×${height}).`;
  }
  if (spec.maxWidth != null && spec.maxHeight != null) {
    if (width > spec.maxWidth || height > spec.maxHeight) {
      return `الصورة كبيرة جداً. الحد الأقصى ${spec.maxWidth}×${spec.maxHeight} بكسل (الحالية ${width}×${height}). صغّرها قبل الرفع.`;
    }
  }
  return null;
}

export type ProcessedImage = {
  dataUrl: string;
  width: number;
  height: number;
};

/** تصغير مع الحفاظ على نسبة العرض — بدون قصّ إجباري */
export async function processImageFilePreserveAspect(
  file: File,
  spec: Pick<
    ImageOutputSpec,
    "minWidth" | "minHeight" | "maxWidth" | "maxHeight" | "jpegQuality"
  > & { maxLongEdge: number },
): Promise<ProcessedImage> {
  const decoded = await decodeImageFile(file);

  const err = validateImageDimensions(decoded.width, decoded.height, spec);
  if (err) throw new Error(err);

  let outW = decoded.width;
  let outH = decoded.height;
  const longEdge = Math.max(outW, outH);
  if (longEdge > spec.maxLongEdge) {
    const scale = spec.maxLongEdge / longEdge;
    outW = Math.max(1, Math.round(outW * scale));
    outH = Math.max(1, Math.round(outH * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر معالجة الصورة");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  try {
    decoded.draw(ctx, 0, 0, outW, outH);
  } finally {
    decoded.dispose?.();
  }

  try {
    const dataUrl = canvas.toDataURL("image/jpeg", spec.jpegQuality);
    if (!dataUrl.startsWith("data:image/")) throw new Error("encode failed");
    return { dataUrl, width: outW, height: outH };
  } catch {
    throw new Error("تعذّر حفظ الصورة بعد المعالجة");
  }
}

/** قصّ وتصغير الصورة لإطار ثابت (cover) */
export async function processImageFile(
  file: File,
  spec: ImageOutputSpec,
): Promise<string> {
  const decoded = await decodeImageFile(file);

  const err = validateImageDimensions(decoded.width, decoded.height, spec);
  if (err) throw new Error(err);

  const outW = spec.recommendedWidth;
  const outH = spec.recommendedHeight;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر معالجة الصورة");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  try {
    drawImageCover(decoded, ctx, outW, outH, spec.fillColor ?? "#ffffff");
  } finally {
    decoded.dispose?.();
  }

  try {
    const dataUrl = canvas.toDataURL("image/jpeg", spec.jpegQuality);
    if (!dataUrl.startsWith("data:image/")) throw new Error("encode failed");
    return dataUrl;
  } catch {
    throw new Error("تعذّر حفظ الصورة بعد المعالجة");
  }
}
