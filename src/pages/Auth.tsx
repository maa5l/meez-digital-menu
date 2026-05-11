import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/Brand";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background" dir="rtl">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative bg-gradient-hero text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute top-20 -right-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2 text-primary-foreground">
          <Logo className="h-10 w-auto aspect-[1031/736]" />
        </Link>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 border border-accent/30 px-4 py-1.5 mb-6">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold">تجربة مجانية 14 يوم</span>
          </div>
          <h2 className="font-display font-black text-4xl xl:text-5xl leading-tight mb-4">
            ارتقِ بتجربة ضيوفك إلى <span className="text-gradient-gold">مستوى جديد</span>
          </h2>
          <p className="text-primary-foreground/70 text-lg leading-relaxed max-w-md">
            انضم لمئات المطاعم والمقاهي التي تستخدم ميز لعرض منيو رقمي فاخر.
          </p>
        </div>

        <div className="relative text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} ميز. جميع الحقوق محفوظة.
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8 justify-center text-primary">
            <Logo className="h-9 w-auto aspect-[1031/736]" />
          </Link>

          <div className="inline-flex p-1 bg-secondary rounded-xl mb-8">
            <button
              onClick={() => setMode("signup")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === "signup" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"
              }`}
            >
              حساب جديد
            </button>
            <button
              onClick={() => setMode("login")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === "login" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"
              }`}
            >
              تسجيل الدخول
            </button>
          </div>

          <h1 className="font-display font-black text-3xl md:text-4xl text-primary mb-2">
            {mode === "signup" ? "ابدأ تجربتك المجانية" : "أهلًا بعودتك"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "signup" ? "14 يوم بدون بطاقة ائتمان" : "سجّل الدخول للوصول إلى لوحة التحكم"}
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">اسم المنشأة</Label>
                  <Input id="name" placeholder="مثال: مقهى الواحة" required className="h-12 rounded-xl" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" placeholder="you@example.com" required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" placeholder="••••••••" required className="h-12 rounded-xl" />
            </div>

            <Button type="submit" variant="hero" size="xl" className="w-full">
              {mode === "signup" ? "أنشئ الحساب وابدأ التجربة" : "دخول"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            بإنشاء الحساب فأنت توافق على{" "}
            <a href="#" className="text-accent font-semibold hover:underline">الشروط</a> و
            <a href="#" className="text-accent font-semibold hover:underline mr-1">سياسة الخصوصية</a>
          </p>

          <div className="mt-6 text-center">
            <Link to="/display" className="text-sm text-muted-foreground hover:text-accent">
              هل لديك جهاز تابلت؟ افتح شاشة الرمز ←
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;