import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { Logo } from "@/components/Brand";
import { loginSchema, signupSchema } from "@/validations/auth.schema";
import { signInWithPassword, signUp, usesSupabaseAuth } from "@/services/auth/auth.service";
import { resolvePostAuthRoute } from "@/services/admin/admin.service";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";
import { checkRateLimit } from "@/security/rate-limit";
import { RateLimitError, getErrorMessage } from "@/lib/errors";
import { ROUTES } from "@/config/app";
import { SUBSCRIPTION } from "@/config/subscription";
import { toast } from "sonner";

type AuthMode = "login" | "signup";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [venueName, setVenueName] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.dashboard;
  const supabaseAuth = usesSupabaseAuth();

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setFieldError("");
    setEmail("");
    setPassword("");
    setVenueName("");
    setPhone("");
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    const rate = checkRateLimit("auth:login", 8, 60_000);
    if (!rate.allowed) {
      setFieldError(new RateLimitError(rate.retryAfterMs).message);
      return;
    }

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة");
      return;
    }

    setLoading(true);
    try {
      await signInWithPassword(parsed.data.email, parsed.data.password);
      toast.success("مرحبًا بعودتك");
      navigate(await resolvePostAuthRoute(redirectTo), { replace: true });
    } catch (error) {
      setFieldError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    const rate = checkRateLimit("auth:submit", 5, 60_000);
    if (!rate.allowed) {
      setFieldError(new RateLimitError(rate.retryAfterMs).message);
      return;
    }

    const parsed = signupSchema.safeParse({ email, password, phone, venueName });
    if (!parsed.success) {
      setFieldError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة");
      return;
    }

    setLoading(true);
    try {
      await signUp(
        parsed.data.email,
        parsed.data.password,
        parsed.data.venueName,
        parsed.data.phone,
      );
      toast.success("تم إنشاء الحساب — مرحباً بك");
      navigate(await resolvePostAuthRoute(redirectTo), { replace: true });
    } catch (error) {
      setFieldError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loginForm = (
    <form key="login" onSubmit={onLogin} className="space-y-5" noValidate autoComplete="on">
      <div className="space-y-2">
        <Label htmlFor="login-email">البريد الإلكتروني</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="h-12 rounded-xl"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">كلمة المرور</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
          className="h-12 rounded-xl"
          autoComplete="current-password"
        />
      </div>
      {fieldError && <p className="text-destructive text-sm font-semibold">{fieldError}</p>}
      <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري تسجيل الدخول...
          </>
        ) : (
          "تسجيل الدخول"
        )}
      </Button>
    </form>
  );

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
            <span className="text-sm font-bold">تجربة مجانية {SUBSCRIPTION.trialDays} أيام</span>
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
              onClick={() => switchMode("signup")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === "signup" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"
              }`}
            >
              حساب جديد
            </button>
            <button
              type="button"
              onClick={() => switchMode("login")}
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
            {mode === "signup" ? `${SUBSCRIPTION.trialDays} أيام بدون بطاقة ائتمان` : "أدخل بريدك وكلمة المرور"}
          </p>

          {!isSupabaseConfigured() ? (
            <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              {appEnv.isProd
                ? "Supabase غير مضبوط على Vercel — أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (مفتاح eyJ…) ثم Redeploy."
                : "Supabase غير مضبوط — أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env.local"}
            </p>
          ) : !supabaseAuth ? (
            <p className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-900">
              وضع تجريبي محلي: الحساب يُحفظ في المتصفح فقط. لإيقافه:{" "}
              <code className="text-xs">VITE_USE_LOCAL_MOCK_AUTH=false</code>
            </p>
          ) : null}

          {mode === "signup" ? (
            <form key="signup" onSubmit={onSignup} className="space-y-5" noValidate autoComplete="on">
              <div className="space-y-2">
                <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-12 rounded-xl"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">كلمة المرور</Label>
                <Input
                  id="signup-password"
                  name="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="h-12 rounded-xl"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-phone">رقم الجوال</Label>
                <Input
                  id="signup-phone"
                  name="tel"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  required
                  className="h-12 rounded-xl text-left"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-name">اسم المنشأة</Label>
                <Input
                  id="venue-name"
                  name="organization"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="مثال: مقهى الواحة"
                  required
                  className="h-12 rounded-xl"
                  autoComplete="organization"
                />
              </div>
              {fieldError && <p className="text-destructive text-sm font-semibold">{fieldError}</p>}
              <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  "أنشئ الحساب وابدأ التجربة"
                )}
              </Button>
            </form>
          ) : (
            loginForm
          )}

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
        </div>
      </div>
    </div>
  );
};

export default Auth;
