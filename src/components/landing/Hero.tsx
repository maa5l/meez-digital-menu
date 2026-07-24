import { Button } from "@/components/ui/button";
import { SUBSCRIPTION } from "@/config/subscription";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative pt-32 md:pt-44 pb-24 md:pb-36 overflow-x-hidden bg-gradient-cream">
      <div className="absolute top-20 -left-40 w-96 h-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center animate-fade-in-up flex flex-col items-center gap-8 md:gap-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 border border-accent/30 px-4 py-1.5">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-primary">
              جديد · جرّب {SUBSCRIPTION.trialDays} أيام مجانًا
            </span>
          </div>

          <h1 className="font-display font-black text-5xl md:text-6xl lg:text-7xl text-primary flex flex-col items-center gap-4 md:gap-6">
            <span className="block leading-[1.35]">منيو رقمي تفاعلي</span>
            <span className="block text-accent leading-[1.35]">يليق بمشروع قهوتك</span>
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-[1.9] max-w-3xl">
            منصة <strong className="text-primary">ميز</strong> تحوّل شاشات المقهى إلى منيو فاخر للمشروبات والمحاصيل بلمسة واحدة.
            <br className="hidden sm:block" />
            <span className="block sm:inline mt-3 sm:mt-0 sm:ms-1">
              عرض جميل، تحديث فوري، وإدارة كاملة من لوحة تحكم واحدة.
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto pt-2">
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

          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
            تفعيل خلال دقائق
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
