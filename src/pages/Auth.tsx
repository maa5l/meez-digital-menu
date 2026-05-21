import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { Logo } from "@/components/Brand";
import { loginSchema, signupSchema } from "@/validations/auth.schema";
import { signIn, signUp, usesSupabaseAuth } from "@/services/auth/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";
import { checkRateLimit } from "@/security/rate-limit";
import { RateLimitError, getErrorMessage } from "@/lib/errors";
import { ROUTES } from "@/config/app";
import { toast } from "sonner";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [venueName, setVenueName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.dashboard;
  const supabaseAuth = usesSupabaseAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    const rate = checkRateLimit("auth:submit", 5, 60_000);
    if (!rate.allowed) {
      setFieldError(new RateLimitError(rate.retryAfterMs).message);
      return;
    }

    const parsed =
      mode === "signup"
        ? signupSchema.safeParse({ email, password, venueName })
        : loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setFieldError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { needsEmailConfirmation } = await signUp(
          parsed.data.email,
          parsed.data.password,
          "venueName" in parsed.data ? parsed.data.venueName : undefined,
        );
        if (needsEmailConfirmation) {
          toast.success(
            "تم إنشاء الحساب في Supabase. افتح رابط التفعيل في بريدك ثم سجّل الدخول.",
            { duration: 8000 },
          );
          setMode("login");
          return;
        }
        toast.success("تم إنشاء الحساب وتفعيله");
      } else {
        await signIn(parsed.data.email, parsed.data.password);
        toast.success("مرحبًا بعودتك");
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const msg = getErrorMessage(error);
      const lower = msg.toLowerCase();
      if (lower.includes("invalid login") || lower.includes("invalid_credentials")) {
        setFieldError(
          supabaseAuth
            ? "البريد أو كلمة المرور غير صحيحة. إن سجّلت محلياً بوضع تجريبي، أنشئ حساباً من هنا أو استخدم نفس بريد Supabase."
            : "البريد أو كلمة المرور غير صحيحة",
        );
      } else if (lower.includes("email not confirmed")) {
        setFieldError("فعّل حسابك من رابط البريد الإلكتروني أولاً");
      } else if (lower.includes("invalid api key") || lower.includes("jwt")) {
        setFieldError("مفتاح Supabase على Vercel غير صحيح. راجع VITE_SUPABASE_ANON_KEY وأعد النشر.");
      } else if (msg.includes("المصادقة غير متاحة")) {
        setFieldError(msg);
      } else {
        setFieldError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background" dir="rtl">
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
            انضم لمئات المطاعم والمقاهي التي تستخدم قائمة لعرض منيو رقمي فاخر.
          </p>
        </div>

        <div className="relative text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} قائمة. جميع الحقوق محفوظة.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8 justify-center text-primary">
            <Logo className="h-9 w-auto aspect-[1031/736]" />
          </Link>

          <div className="inline-flex p-1 bg-secondary rounded-xl mb-8">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === "signup" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"
              }`}
            >
              حساب جديد
            </button>
            <button
              type="button"
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

          {!isSupabaseConfigured() ? (
            <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              {appEnv.isProd
                ? "Supabase غير مضبوط على Vercel — أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (مفتاح eyJ…) ثم Redeploy."
                : "Supabase غير مضبوط — أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env.local"}
            </p>
          ) : !supabaseAuth ? (
            <p className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-900">
              وضع تجريبي محلي: الحساب يُحفظ في المتصفح فقط وليس في قاعدة البيانات. لإيقافه:{" "}
              <code className="text-xs">VITE_USE_LOCAL_MOCK_AUTH=false</code>
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">اسم المنشأة</Label>
                <Input
                  id="name"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="مثال: مقهى الواحة"
                  required
                  className="h-12 rounded-xl"
                  autoComplete="organization"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-12 rounded-xl"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="h-12 rounded-xl"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            {fieldError && <p className="text-destructive text-sm font-semibold">{fieldError}</p>}
            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري المعالجة...
                </>
              ) : mode === "signup" ? (
                "أنشئ الحساب وابدأ التجربة"
              ) : (
                "دخول"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            بإنشاء الحساب فأنت توافق على{" "}
            <Link to="/" className="text-accent font-semibold hover:underline">
              الشروط
            </Link>{" "}
            و
            <Link to="/" className="text-accent font-semibold hover:underline mr-1">
              سياسة الخصوصية
            </Link>
          </p>

          <div className="mt-6 text-center">
            <Link to={ROUTES.display} className="text-sm text-muted-foreground hover:text-accent">
              هل لديك جهاز تابلت؟ افتح شاشة الرمز ←
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
