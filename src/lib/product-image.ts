import { processImageFile } from "./canvas-image";
import { PRODUCT_IMAGE_SPEC } from "./product-image-spec";

export { PRODUCT_IMAGE_SPEC } from "./product-image-spec";

export async function processProductImageFile(file: File): Promise<string> {
  return processImageFile(file, {
    ...PRODUCT_IMAGE_SPEC,
    fillColor: "#ffffff",
  });
}
