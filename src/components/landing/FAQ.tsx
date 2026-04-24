import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "هل أحتاج إلى أجهزة خاصة؟",
    a: "لا. منصة قائمة تعمل على أي جهاز تابلت يدعم متصفح حديث، مثل iPad أو أجهزة أندرويد اللوحية.",
  },
  {
    q: "كيف يتم احتساب عدد الشاشات؟",
    a: "كل جهاز يتم تفعيله برمز خاص يُحتسب كشاشة واحدة. يمكنك إضافة أو إزالة الشاشات من لوحة التحكم في أي وقت.",
  },
  {
    q: "ماذا يحدث بعد انتهاء التجربة المجانية؟",
    a: "ستحتاج إلى الاشتراك بـ 45 ريال لكل شاشة شهريًا للاستمرار في عرض المنيو. بياناتك تبقى محفوظة دائمًا.",
  },
  {
    q: "هل يمكنني تعديل المنيو في أي وقت؟",
    a: "نعم، أي تعديل تجريه من لوحة التحكم يظهر فورًا على جميع الأجهزة المرتبطة بحسابك.",
  },
  {
    q: "هل تدعمون اللغة العربية؟",
    a: "بالتأكيد، المنصة مبنية بالكامل لدعم اللغة العربية واتجاه RTL في كل من لوحة التحكم وشاشة العرض.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-24 md:py-32 bg-gradient-cream">
      <div className="container max-w-3xl">
        <div className="text-center mb-12">
          <span className="inline-block text-accent font-bold mb-3 tracking-wide">الأسئلة الشائعة</span>
          <h2 className="font-display font-black text-4xl md:text-5xl text-primary">
            كل ما تحتاج معرفته
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="bg-card border border-border rounded-2xl px-6 shadow-soft data-[state=open]:shadow-warm data-[state=open]:border-accent/40 transition-all"
            >
              <AccordionTrigger className="font-display font-bold text-lg text-primary hover:no-underline py-5 text-right">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed text-base pb-5">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;