import { LayoutGrid, Columns2, FolderTree, MonitorSmartphone, Zap, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: Columns2,
    title: "عرض Split View",
    desc: "قائمة المنتجات على جانب وتفاصيلها الكاملة على الجانب الآخر — تجربة لمسية انسيابية.",
  },
  {
    icon: LayoutGrid,
    title: "عرض البطاقات",
    desc: "بطاقات أنيقة بصور المنتجات، يفتح كل عنصر تفاصيله في نافذة تفاعلية بلمسة واحدة.",
  },
  {
    icon: FolderTree,
    title: "تصنيفات ذكية",
    desc: "نظّم منتجاتك في تصنيفات: قهوة، حلويات، مشروبات… وأعد ترتيبها متى شئت.",
  },
  {
    icon: MonitorSmartphone,
    title: "إدارة الأجهزة",
    desc: "كل جهاز يُفعّل برمز خاص. تحكّم في عدد الشاشات وامنع الاستخدام غير المصرح به.",
  },
  {
    icon: Zap,
    title: "تحديث فوري",
    desc: "غيّر السعر أو أضف منتجًا من اللوحة، وسيظهر مباشرة على كل أجهزة الفرع.",
  },
  {
    icon: ShieldCheck,
    title: "اشتراك مرن",
    desc: "ادفع فقط مقابل عدد الشاشات التي تستخدمها — 45 ريال للشاشة شهريًا.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-accent font-bold mb-3 tracking-wide">المميزات</span>
          <h2 className="font-display font-black text-4xl md:text-5xl text-primary mb-4">
            كل ما يحتاجه مطعمك في مكان واحد
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            صُممت قائمة لتمنح ضيوفك تجربة استثنائية، وتمنحك أنت سيطرة كاملة على المنيو من جهاز واحد.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative p-8 rounded-3xl bg-card border border-border hover:border-accent/40 hover:shadow-warm transition-all duration-500"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-gold opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-secondary group-hover:bg-gradient-gold flex items-center justify-center mb-5 transition-all duration-500">
                  <f.icon className="w-6 h-6 text-accent group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-display font-bold text-xl text-primary mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;