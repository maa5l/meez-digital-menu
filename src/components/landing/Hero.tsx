import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroTablet from "@/assets/hero-tablet.jpg";

const Hero = () => {
  return (
    <section className="relative pt-32 md:pt-40 pb-20 md:pb-32 overflow-hidden bg-gradient-cream">
      {/* Decorative gold blur */}
      <div className="absolute top-20 -left-40 w-96 h-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Text */}
          <div className="text-center lg:text-right animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 border border-accent/30 px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-primary">جديد · جرّب 14 يوم مجانًا</span>
            </div>

            <h1 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight text-primary mb-6">
              منيو رقمي تفاعلي
              <br />
              <span className="text-gradient-gold">يليق بمطعمك</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
              منصة <strong className="text-primary">قائمة</strong> تحوّل أجهزة الآيباد داخل فرعك إلى منيو فاخر بلمسة واحدة. عرض جميل، تحديث فوري، وإدارة كاملة من لوحة تحكم واحدة.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/auth">
                <Button variant="hero" size="xl" className="group w-full sm:w-auto">
                  ابدأ تجربتك المجانية
                  <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/menu">
                <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
                  شاهد المنيو الحي
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent" />
                بدون بطاقة ائتمان
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent" />
                تفعيل خلال دقائق
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="absolute inset-0 bg-gradient-gold rounded-[2rem] blur-2xl opacity-30 scale-95" />
            <div className="relative rounded-[2rem] overflow-hidden shadow-warm border border-accent/20 animate-float">
              <img
                src={heroTablet}
                alt="منيو تفاعلي على جهاز التابلت داخل المطعم"
                width={1536}
                height={1024}
                className="w-full h-auto"
              />
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 lg:-left-12 bg-card rounded-2xl shadow-warm border border-border p-4 flex items-center gap-3 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center text-primary font-black text-lg">
                ٤٥
              </div>
              <div>
                <div className="font-bold text-primary">ريال / شاشة</div>
                <div className="text-xs text-muted-foreground">شهريًا فقط</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;