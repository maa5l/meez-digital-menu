export type Category = {
  id: string;
  name: string;
  icon: string;
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
  description: string;
  price: number;
  calories: number;
  image?: string;
  allergens?: string;
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

export type MenuSettings = {
  productTemplate: ProductTemplate;
  cropsTemplate: CropsTemplate;
  bgColor: string;
  textColor: string;
  accentColor: string;
  showBurnBar: boolean;
  bgImage?: string;
  cardColor?: string;
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
