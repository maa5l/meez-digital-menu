const steps = [
  {
    n: "١",
    title: "أنشئ حسابك",
    desc: "سجّل في دقيقة واحدة وابدأ تجربتك المجانية لمدة 14 يومًا بدون أي بطاقة ائتمان.",
  },
  {
    n: "٢",
    title: "صمّم منيوك",
    desc: "أضف التصنيفات والمنتجات مع الأسعار والصور والوصف من لوحة التحكم.",
  },
  {
    n: "٣",
    title: "احصل على رمز الجهاز",
    desc: "ولّد رمزًا خاصًا بكل جهاز تابلت في فرعك. أدخل الرمز ليفتح المنيو فورًا.",
  },
  {
    n: "٤",
    title: "اعرض واربح",
    desc: "ضيوفك يستمتعون بمنيو تفاعلي فاخر، وأنت تتحكم بكل شيء من مكان واحد.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how" className="py-24 md:py-32 bg-gradient-cream">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-accent font-bold mb-3 tracking-wide">كيف يعمل</span>
          <h2 className="font-display font-black text-4xl md:text-5xl text-primary mb-4">
            من الصفر للمنيو في أربع خطوات
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="bg-card rounded-3xl p-8 border border-border hover:shadow-warm transition-all duration-500 h-full">
                <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center font-display font-black text-2xl text-primary mb-5 shadow-gold">
                  {s.n}
                </div>
                <h3 className="font-display font-bold text-xl text-primary mb-2">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -left-2 w-4 h-0.5 bg-accent/40" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;