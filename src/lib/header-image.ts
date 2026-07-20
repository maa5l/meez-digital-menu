import {
  processImageFilePreserveAspect,
  validateImageDimensions,
  type ProcessedImage,
} from "./canvas-image";
import { HEADER_IMAGE_SPEC } from "./header-image-spec";

export {
  HEADER_IMAGE_SPEC,
  formatHeaderImageDisplayLabel,
  formatHeaderImageSpecLabel,
} from "./header-image-spec";

export function validateHeaderImageDimensions(
  width: number,
  height: number,
): string | null {
  return validateImageDimensions(width, height, HEADER_IMAGE_SPEC);
}

/** ضغط بانر الهيدر مع الحفاظ على مقاس/نسبة الصورة الأصلية */
export async function processHeaderImageFile(file: File): Promise<ProcessedImage> {
  return processImageFilePreserveAspect(file, {
    minWidth: HEADER_IMAGE_SPEC.minWidth,
    minHeight: HEADER_IMAGE_SPEC.minHeight,
    maxWidth: HEADER_IMAGE_SPEC.maxWidth,
    maxHeight: HEADER_IMAGE_SPEC.maxHeight,
    maxLongEdge: HEADER_IMAGE_SPEC.maxOutputLongEdge,
    jpegQuality: HEADER_IMAGE_SPEC.jpegQuality,
  });
}
