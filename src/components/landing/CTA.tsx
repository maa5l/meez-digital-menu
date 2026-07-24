import { Button } from "@/components/ui/button";
import { SUBSCRIPTION } from "@/config/subscription";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-hero p-12 md:p-20 text-center shadow-warm">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative max-w-2xl mx-auto">
            <h2 className="font-display font-black text-4xl md:text-6xl text-primary-foreground mb-6 leading-tight">
              جاهز ترفع <span className="text-gradient-gold">تجربة ضيوفك</span>؟
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 leading-relaxed">
              ابدأ تجربتك المجانية اليوم — {SUBSCRIPTION.trialDays} أيام كاملة بدون أي قيود وبدون بطاقة ائتمان.
            </p>
            <Link to="/auth">
              <Button variant="hero" size="xl" className="group">
                ابدأ الآن مجانًا
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;