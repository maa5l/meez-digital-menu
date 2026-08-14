import { processImageFile, processImageFilePreserveAspect } from "./canvas-image";
import {
  PRODUCT_IMAGE_SPEC,
  PRODUCT_LANDSCAPE_IMAGE_SPEC,
  PRODUCT_PORTRAIT_IMAGE_SPEC,
} from "./product-image-spec";

export {
  PRODUCT_IMAGE_SPEC,
  PRODUCT_LANDSCAPE_IMAGE_SPEC,
  PRODUCT_PORTRAIT_IMAGE_SPEC,
} from "./product-image-spec";

export async function processProductImageFile(file: File): Promise<string> {
  return processImageFile(file, {
    ...PRODUCT_IMAGE_SPEC,
    fillColor: "#ffffff",
  });
}

export async function processProductLandscapeImageFile(file: File): Promise<string> {
  const processed = await processImageFilePreserveAspect(file, PRODUCT_LANDSCAPE_IMAGE_SPEC);
  return processed.dataUrl;
}

export async function processProductPortraitImageFile(file: File): Promise<string> {
  const processed = await processImageFilePreserveAspect(file, PRODUCT_PORTRAIT_IMAGE_SPEC);
  return processed.dataUrl;
}
