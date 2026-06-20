import { PRODUCT_CARD } from "./product-card-spec";

/** مقاس صورة المنتج — يطابق إطار البطاقة 250×270 (×2 للشاشات عالية الدقة) */
export const PRODUCT_IMAGE_SPEC = {
  recommendedWidth: PRODUCT_CARD.imageWidth * 2,
  recommendedHeight: PRODUCT_CARD.imageHeight * 2,
  minWidth: PRODUCT_CARD.imageWidth,
  minHeight: PRODUCT_CARD.imageHeight,
  targetAspect: PRODUCT_CARD.imageWidth / PRODUCT_CARD.imageHeight,
  jpegQuality: 0.92,
} as const;
