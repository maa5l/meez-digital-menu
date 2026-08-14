/** أبعاد بطاقة المنتج في منيو الشبكة — القالب 280×370 */
export const PRODUCT_CARD = {
  width: 280,
  height: 370,
  imageWidth: 250,
  /** صورة أقصر قليلاً لإتاحة مساحة للتذييل بدون قصّ الأسماء/الأسعار */
  imageHeight: 235,
  padX: 15,
  padTop: 12,
  padBottom: 12,
  /** ارتفاع منطقة النص = القالب − الهامش − الصورة */
  footerHeight: 370 - 12 - 235 - 12,
} as const;

export const PRODUCT_CARD_FOOTER_HEIGHT = `${(PRODUCT_CARD.footerHeight / PRODUCT_CARD.height) * 100}%`;

export const PRODUCT_CARD_ASPECT = `${PRODUCT_CARD.width}/${PRODUCT_CARD.height}`;
export const PRODUCT_IMAGE_ASPECT = `${PRODUCT_CARD.imageWidth}/${PRODUCT_CARD.imageHeight}`;

/** نسبة الهامش الأفقي والعلوي كنسبة مئوية من القالب */
export const PRODUCT_CARD_PAD_X = `${(PRODUCT_CARD.padX / PRODUCT_CARD.width) * 100}%`;
export const PRODUCT_CARD_PAD_TOP = `${(PRODUCT_CARD.padTop / PRODUCT_CARD.height) * 100}%`;
export const PRODUCT_CARD_PAD_BOTTOM = `${(PRODUCT_CARD.padBottom / PRODUCT_CARD.height) * 100}%`;
