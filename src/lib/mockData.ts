export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  calories: number;
  image?: string;
  cropInfo?: CropInfo;
};

/** معلومات المحاصيل — تظهر للمنتجات من نوع البن المختص */
export type CropInfo = {
  beanName: string;      // اسم البن
  country: string;       // البلد
  process: string;       // نوع المعالجة
  variety: string;       // السلالة
  altitude: string;      // الارتفاع
  notes: string;         // الإيحاءات
};

export type Device = {
  id: string;
  name: string;
  code: string;
  lastActive: string;
  status: "active" | "inactive";
};

export const categories: Category[] = [
  { id: "c1", name: "القهوة المختصة", icon: "☕" },
  { id: "c2", name: "المشروبات الباردة", icon: "🥤" },
  { id: "c3", name: "الحلويات", icon: "🍰" },
  { id: "c4", name: "المخبوزات", icon: "🥐" },
  { id: "c5", name: "السندويتشات", icon: "🥪" },
];

export const products: Product[] = [
  {
    id: "p1",
    categoryId: "c1",
    name: "إسبريسو مفرد",
    description: "جرعة مركزة من البن العربي المختار، محمصة بعناية لاستخراج أعمق النكهات.",
    price: 12,
    calories: 5,
    image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80",
    cropInfo: {
      beanName: "سيدامو",
      country: "إثيوبيا",
      process: "طبيعية",
      variety: "هيرلوم",
      altitude: "١٩٠٠ م",
      notes: "شوكولاتة داكنة، توت، كراميل",
    },
  },
  {
    id: "p2",
    categoryId: "c1",
    name: "كابتشينو",
    description: "إسبريسو غني مع رغوة حليب مخملية، يُقدّم بفن الباريستا الإيطالي.",
    price: 18,
    calories: 120,
    image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80",
    cropInfo: {
      beanName: "هوامبيلا",
      country: "كولومبيا",
      process: "مغسولة",
      variety: "كاتورا",
      altitude: "١٧٥٠ م",
      notes: "كراميل، بندق، تفاح أحمر",
    },
  },
  {
    id: "p3",
    categoryId: "c1",
    name: "لاتيه فانيليا",
    description: "حليب مبخر ناعم مع لمسة من الفانيليا الطبيعية وقطرات من الإسبريسو.",
    price: 22,
    calories: 180,
    image: "https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600&q=80",
  },
  {
    id: "p4",
    categoryId: "c1",
    name: "قهوة عربية",
    description: "قهوة عربية أصيلة بنكهة الهيل، تُقدّم مع التمر السكري.",
    price: 15,
    calories: 10,
    image: "https://images.unsplash.com/photo-1494314671902-399b18174975?w=600&q=80",
  },
  {
    id: "p13",
    categoryId: "c1",
    name: "في60 إثيوبي",
    description: "تخمير V60 بنكهات فاكهية مشرقة وحموضة لطيفة، مثالية لمحبي البن المختص.",
    price: 26,
    calories: 5,
    image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&q=80",
    cropInfo: {
      beanName: "يرقاتشيف",
      country: "إثيوبيا",
      process: "مغسولة",
      variety: "هيرلوم",
      altitude: "٢٠٠٠ م",
      notes: "ياسمين، ليمون، شاي أسود",
    },
  },
  {
    id: "p5",
    categoryId: "c2",
    name: "آيس لاتيه",
    description: "إسبريسو بارد مع حليب وثلج مجروش، انعاش لا يقاوم.",
    price: 20,
    calories: 150,
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&q=80",
  },
  {
    id: "p6",
    categoryId: "c2",
    name: "ليمونادة بالنعناع",
    description: "ليمون طازج مع أوراق النعناع الجبلي وقطرات من شراب القصب.",
    price: 16,
    calories: 90,
    image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80",
  },
  {
    id: "p7",
    categoryId: "c3",
    name: "تشيز كيك التوت",
    description: "قاعدة بسكويت ذهبية، طبقة جبن كريمية، وصلصة توت طازجة.",
    price: 28,
    calories: 380,
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80",
  },
  {
    id: "p8",
    categoryId: "c3",
    name: "كنافة بالقشطة",
    description: "شعيرات الكنافة الذهبية محشوة بقشطة طازجة ومسقاة بقطر الورد.",
    price: 32,
    calories: 420,
    image: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&q=80",
  },
  {
    id: "p9",
    categoryId: "c3",
    name: "براوني الشوكولاتة",
    description: "براوني داكن غني مع قطع شوكولاتة ذائبة وكرة آيس كريم فانيليا.",
    price: 26,
    calories: 450,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80",
  },
  {
    id: "p10",
    categoryId: "c4",
    name: "كرواسون الزبدة",
    description: "كرواسون فرنسي طازج بطبقات ذهبية مقرمشة وداخل ناعم.",
    price: 14,
    calories: 230,
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80",
  },
  {
    id: "p11",
    categoryId: "c4",
    name: "بان أو شوكولا",
    description: "عجينة كرواسون محشوة بقطع الشوكولاتة البلجيكية الفاخرة.",
    price: 17,
    calories: 290,
    image: "https://images.unsplash.com/photo-1623334044303-241021148842?w=600&q=80",
  },
  {
    id: "p12",
    categoryId: "c5",
    name: "كلوب ساندويتش",
    description: "ثلاث طبقات من الخبز المحمص مع دجاج مشوي وخضار طازج.",
    price: 38,
    calories: 520,
    image: "https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=600&q=80",
  },
];

export const devices: Device[] = [
  { id: "d1", name: "الكاشير الرئيسي", code: "QM-4821", lastActive: "قبل دقيقتين", status: "active" },
  { id: "d2", name: "طاولة 3", code: "QM-7193", lastActive: "قبل 5 دقائق", status: "active" },
  { id: "d3", name: "طاولة 7", code: "QM-2056", lastActive: "قبل ساعة", status: "inactive" },
];

export const subscription = {
  plan: "الباقة الأساسية",
  status: "نشط",
  screens: 3,
  maxScreens: 5,
  pricePerScreen: 45,
  renewsOn: "15 مايو 2026",
  daysLeft: 21,
};

/* ============================================================
 * Coffee Crops — مكتبة محاصيل البن (مستقلة عن المنتجات)
 * تعرض على شاشة منفصلة (/menu?type=crops) للعملاء/الكاشير.
 * ============================================================ */
export type Crop = {
  id: string;
  beanName: string;       // اسم البن (عربي)
  beanNameEn: string;     // English name
  country: string;        // البلد
  countryEn: string;
  process: string;        // نوع المعالجة
  processEn: string;
  variety: string;        // السلالة
  altitude: string;       // الارتفاع
  notes: string;          // الإيحاءات
  notesEn: string;
  image?: string;            // صورة بطاقة المحصول (إذا bgType=image)
  cardColor?: string;        // لون خلفية البطاقة (إذا bgType=color)
  textColor?: string;        // لون خط البطاقة
  bgType?: "color" | "gradient" | "image";
  gradientColors?: string[]; // 2–3 ألوان لتدرج البطاقة
};

export const crops: Crop[] = [
  {
    id: "cr1",
    beanName: "مولو — مزيج إثيوبي",
    beanNameEn: "Molo – Ethiopian Blend",
    country: "إثيوبيا",
    countryEn: "Ethiopia",
    process: "مجففة",
    processEn: "Natural",
    variety: "هيرلوم",
    altitude: "١٨٠٠ - ٢٠٠٠ م",
    notes: "التفاح، التوت، الشوكولاته، كراميل",
    notesEn: "Apple, Berry, Chocolate, Caramel",
  },
  {
    id: "cr2",
    beanName: "يرقاتشيف",
    beanNameEn: "Yirgacheffe",
    country: "إثيوبيا",
    countryEn: "Ethiopia",
    process: "مجفف",
    processEn: "Natural",
    variety: "هيرلوم",
    altitude: "٢٠٠٠ م",
    notes: "أزهار - توتيات - شوكولاته",
    notesEn: "Flowers - Berries - Chocolate",
  },
  {
    id: "cr3",
    beanName: "هوامبيلا",
    beanNameEn: "Huambelo",
    country: "كولومبيا",
    countryEn: "Colombia",
    process: "مغسولة",
    processEn: "Washed",
    variety: "كاتورا",
    altitude: "١٧٥٠ م",
    notes: "كراميل، بندق، تفاح أحمر",
    notesEn: "Caramel, Hazelnut, Red Apple",
  },
  {
    id: "cr4",
    beanName: "سيدامو",
    beanNameEn: "Sidamo",
    country: "إثيوبيا",
    countryEn: "Ethiopia",
    process: "طبيعية",
    processEn: "Natural",
    variety: "هيرلوم",
    altitude: "١٩٠٠ م",
    notes: "شوكولاتة داكنة، توت، كراميل",
    notesEn: "Dark Chocolate, Berry, Caramel",
  },
];

/* ============================================================
 * Menu Settings — تخصيص يختاره صاحب الحساب من الإعدادات
 * يُحفظ في localStorage ويُقرأ من شاشات /menu
 * ============================================================ */
export type ProductTemplate = "grid" | "split";
export type CropsTemplate = "molo" | "pureshelf";

export type MenuSettings = {
  productTemplate: ProductTemplate;
  cropsTemplate: CropsTemplate;
  bgColor: string;       // hex
  textColor: string;     // hex
  accentColor: string;   // hex
  showBurnBar: boolean;
};

export const defaultMenuSettings: MenuSettings = {
  productTemplate: "grid",
  cropsTemplate: "molo",
  bgColor: "#F1EFEC",
  textColor: "#030303",
  accentColor: "#3068A8",
  showBurnBar: true,
};

const SETTINGS_KEY = "qaemah-menu-settings";

export const loadMenuSettings = (): MenuSettings => {
  if (typeof window === "undefined") return defaultMenuSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      // backward compat: قراءة قيمة قديمة
      const oldTpl = localStorage.getItem("qaemah-template");
      if (oldTpl === "grid" || oldTpl === "split") {
        return { ...defaultMenuSettings, productTemplate: oldTpl };
      }
      return defaultMenuSettings;
    }
    return { ...defaultMenuSettings, ...JSON.parse(raw) };
  } catch {
    return defaultMenuSettings;
  }
};

export const saveMenuSettings = (s: MenuSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
};