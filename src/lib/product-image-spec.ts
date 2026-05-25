/** مقاس صورة المنتج الموصى به — مربع 1:1 لملء بطاقة المنيو */
export const PRODUCT_IMAGE_SPEC = {
  recommendedWidth: 800,
  recommendedHeight: 800,
  minWidth: 400,
  minHeight: 400,
  targetAspect: 1,
  jpegQuality: 0.92,
} as const;
