export type Category = {
  id: string;
  name: string;
  nameEn?: string;
  /** @deprecated لم يعد يُستخدم في الواجهة */
  icon?: string;
};

export type CropInfo = {
  beanName: string;
  country: string;
  process: string;
  variety: string;
  altitude: string;
  notes: string;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  price: number;
  calories: number;
  image?: string;
  allergens?: string;
  allergensEn?: string;
  cropInfo?: CropInfo;
};

export type Device = {
  id: string;
  name: string;
  code: string;
  lastActive: string;
  status: "active" | "inactive";
  /** نوع المنيو على هذه الشاشة */
  menuType?: "products" | "crops";
};

export type ProductTemplate = "featured" | "detail";
export type CropsTemplate = "molo" | "pureshelf";

/** ألوان منيو — منتجات أو محاصيل */
export type MenuPalette = {
  bgColor: string;
  textColor: string;
  accentColor: string;
  cardColor?: string;
  bgImage?: string;
};

/** تخصيص هيدر منيو (منتجات أو محاصيل) */
export type MenuHeaderCustomization = {
  featuredTitle?: string;
  featuredSubtitle?: string;
  featuredImage?: string;
  headerImage?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  logoImage?: string;
  calorieTextColor?: string;
  showLanguageToggle?: boolean;
};

export type MenuSettings = {
  productTemplate: ProductTemplate;
  cropsTemplate: CropsTemplate;
  /** ألوان منيو المنتجات */
  productsColors?: MenuPalette;
  /** ألوان منيو المحاصيل */
  cropsColors?: MenuPalette;
  /** هيدر منيو المحاصيل (منفصل عن المنتجات) */
  cropsHeader?: MenuHeaderCustomization;
  /** @deprecated — يُرحَّل إلى productsColors / cropsColors */
  bgColor?: string;
  /** @deprecated */
  textColor?: string;
  /** @deprecated */
  accentColor?: string;
  /** @deprecated */
  bgImage?: string;
  /** @deprecated */
  cardColor?: string;
  showBurnBar: boolean;
  featuredProductId?: string;
  featuredCropId?: string;
  featuredTitle?: string;
  featuredSubtitle?: string;
  featuredImage?: string;
  /** تخصيص الهيدر */
  headerBgColor?: string;
  headerTextColor?: string;
  logoImage?: string;
  /** صورة بانر الهيدر (فوق العنوان) */
  headerImage?: string;
  burnBarText?: string;
  burnBarTextEn?: string;
  showLanguageToggle?: boolean;
  /** لون نص وأيقونات إفصاح السعرات (اختياري) */
  calorieTextColor?: string;
};

export type AuthSession = {
  userId: string;
  email: string;
  role: "owner" | "staff";
  expiresAt: number;
};

export type Crop = {
  id: string;
  beanName: string;
  beanNameEn: string;
  country: string;
  countryEn: string;
  process: string;
  processEn: string;
  variety: string;
  altitude: string;
  notes: string;
  notesEn: string;
  image?: string;
  cardColor?: string;
  textColor?: string;
  bgType?: "color" | "gradient" | "image";
  gradientColors?: string[];
};
