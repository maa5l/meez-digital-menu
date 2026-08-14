import { PRODUCT_CARD } from "./product-card-spec";

/** مقاس صورة المنتج — يطابق إطار البطاقة 250×250 (×2 للشاشات عالية الدقة) */
export const PRODUCT_IMAGE_SPEC = {
  recommendedWidth: PRODUCT_CARD.imageWidth * 2,
  recommendedHeight: PRODUCT_CARD.imageHeight * 2,
  minWidth: PRODUCT_CARD.imageWidth,
  minHeight: PRODUCT_CARD.imageHeight,
  targetAspect: PRODUCT_CARD.imageWidth / PRODUCT_CARD.imageHeight,
  maxLongEdge: 1280,
  jpegQuality: 0.8,
} as const;

/** صورة عرضية — بانر المنيو وبطاقات الشبكة */
export const PRODUCT_LANDSCAPE_IMAGE_SPEC = {
  recommendedWidth: 1280,
  recommendedHeight: 720,
  minWidth: 640,
  minHeight: 360,
  targetAspect: 16 / 9,
  maxLongEdge: 1280,
  jpegQuality: 0.8,
} as const;

/** صورة عمودية — تفاصيل المنتج */
export const PRODUCT_PORTRAIT_IMAGE_SPEC = {
  recommendedWidth: 900,
  recommendedHeight: 1200,
  minWidth: 450,
  minHeight: 600,
  targetAspect: 3 / 4,
  maxLongEdge: 1200,
  jpegQuality: 0.8,
} as const;
