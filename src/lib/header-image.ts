import { processImageFile, validateImageDimensions } from "./canvas-image";
import { HEADER_IMAGE_SPEC } from "./header-image-spec";

export { HEADER_IMAGE_SPEC } from "./header-image-spec";

export function validateHeaderImageDimensions(
  width: number,
  height: number,
): string | null {
  return validateImageDimensions(width, height, HEADER_IMAGE_SPEC);
}

/** قصّ وتصغير الصورة لبانر الهيدر */
export async function processHeaderImageFile(file: File): Promise<string> {
  return processImageFile(file, {
    ...HEADER_IMAGE_SPEC,
    fillColor: "#f5f0e6",
  });
}
