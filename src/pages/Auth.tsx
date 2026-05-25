import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Sparkles, Loader2 } from "lucide-react";
import { Logo } from "@/components/Brand";
import {
  loginEmailSchema,
  loginOtpSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/validations/auth.schema";
import {
  resetPasswordWithOtp,
  sendPasswordResetOtp,
  sendLoginOtp,
  verifyLoginOtp,
  signUp,
  usesSupabaseAuth,
} from "@/services/auth/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";
import { checkRateLimit } from "@/security/rate-limit";
import { RateLimitError, getErrorMessage } from "@/lib/errors";
import { ROUTES } from "@/config/app";
import { toast } from "sonner";

type LoginStep = "email" | "otp";
type AuthMode = "login" | "signup" | "reset";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [loginStep, setLoginStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [venueName, setVenueName] = useState("");
  const [otp, setOtp] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.dashboard;
  const supabaseAuth = usesSupabaseAuth();

  const resetLoginFlow = () => {
    setLoginStep("email");
    setOtp("");
    setFieldError("");
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    resetLoginFlow();
  };

  const sendOtpToEmail = async () => {
    setFieldError("");

    const rate = checkRateLimit("auth:otp-send", 3, 60_000);
    if (!rate.allowed) {
      setFieldError(new RateLimitError(rate.retryAfterMs).message);
      return false;
    }

    const parsed = loginEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة");
      return false;
    }

    setLoading(true);
    try {
      await sendLoginOtp(parsed.data.email);
      toast.success("أُرسل رمز التحقق إلى بريدك الإلكتروني");
      setLoginStep("otp");
      return true;
    } catch (error) {
      setFieldError(getErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const onSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOtpToEmail();
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    const rate = checkRateLimit("auth:otp-verify", 8, 60_000);
    if (!rate.allowed) {
      setFieldError(new RateLimitError(rate.retryAfterMs).message);
      return;
    }

    const parsed = loginOtpSchema.safeParse({ email, otp });
    if (!parsed.success) {
      setFieldError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة");
      return;
    }

    setLoading(true);
    try {
      await verifyLoginOtp(parsed.data.email, parsed.data.otp);
      toast.success("مرحبًا بعودتك");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFieldError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const sendResetOtpToEmail = async () => {
    setFieldError("");

    const rate = checkRateLimit("auth:password-reset-send", 3, 60_000);
    if (!rate.allowed) {
      setFieldError(new RateLimitError(rate.retryAfterMs).message);
      return false;
    }

    const parsed = loginEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة");
      return false;
    }

    setLoading(true);
    try {
      await sendPasswordResetOtp(parsed.data.email);
      toast.success("أُرسل رمز إعادة التعيين إلى بريدك الإلكتروني");
      setLoginStep("otp");
      return true;
    } catch (error) {
      setFieldError(getErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const onSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendResetOtpToEmail();
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    const rate = checkRateLimit("auth:password-reset-verify", 8, 60_000);
    if (!rate.allowed) {
      setFieldError(new RateLimitError(rate.retryAfterMs).message);
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ email, otp, password });
    if (!parsed.success) {
      setFieldError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOtp(parsed.data.email, parsed.data.otp, parsed.data.password);
      toast.success("تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن برمز البريد.");
      setPassword("");
      switchMode("login");
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

    const parsed = signupSchema.safeParse({ email, password, venueName });
    if (!parsed.success) {
      setFieldError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة");
      return;
    }

    setLoading(true);
    try {
      const signupResult = await signUp(
        parsed.data.email,
        parsed.data.password,
        parsed.data.venueName,
      );
      if (signupResult.needsEmailConfirmation) {
        toast.success(
          "تم إنشاء الحساب. افتح رابط التفعيل في بريدك ثم سجّل الدخول برمز التحقق.",
          { duration: 8000 },
        );
        switchMode("login");
        return;
      }
      toast.success("تم إنشاء الحساب — سجّل الدخول برمز يُرسل إلى بريدك");
      switchMode("login");
    } catch (error) {
      setFieldError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loginForm =
    loginStep === "email" ? (
      <form onSubmit={onSendOtp} className="space-y-5" noValidate>
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
        <p className="text-xs text-muted-foreground">
          سنرسل رمزاً مكوّناً من 6 أرقام إلى بريدك لتسجيل الدخول. هذا منفصل عن كود ربط الشاشات
          (QM-XXXX) في لوحة التحكم.
        </p>
        {fieldError && <p className="text-destructive text-sm font-semibold">{fieldError}</p>}
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            "إرسال رمز التحقق"
          )}
        </Button>
      </form>
    ) : (
      <form onSubmit={onVerifyOtp} className="space-y-5" noValidate>
        <p className="text-sm text-muted-foreground">
          أدخل الرمز المرسل إلى{" "}
          <span className="font-semibold text-foreground" dir="ltr">
            {email}
          </span>
        </p>
        <div className="flex justify-center" dir="ltr">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={1} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={2} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={3} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={4} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={5} className="h-12 w-11 rounded-lg text-lg" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        {!supabaseAuth && (
          <p className="text-xs text-muted-foreground text-center">
            الوضع التجريبي: أي 6 أرقام للدخول.
          </p>
        )}
        {fieldError && <p className="text-destructive text-sm font-semibold">{fieldError}</p>}
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading || otp.length < 6}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري التحقق...
            </>
          ) : (
            "تسجيل الدخول"
          )}
        </Button>
        <div className="flex flex-col gap-2 text-center text-sm">
          <button
            type="button"
            className="text-accent font-semibold hover:underline"
            disabled={loading}
            onClick={() => void sendOtpToEmail()}
          >
            إعادة إرسال الرمز
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={resetLoginFlow}
          >
            تغيير البريد الإلكتروني
          </button>
        </div>
      </form>
    );

  const resetForm =
    loginStep === "email" ? (
      <form onSubmit={onSendResetOtp} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="reset-email">البريد الإلكتروني</Label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="h-12 rounded-xl"
            autoComplete="email"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          سنرسل رمزاً مكوّناً من 6 أرقام لإعادة تعيين كلمة المرور. لا تستخدم رابط البريد.
        </p>
        {fieldError && <p className="text-destructive text-sm font-semibold">{fieldError}</p>}
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            "إرسال رمز إعادة التعيين"
          )}
        </Button>
      </form>
    ) : (
      <form onSubmit={onResetPassword} className="space-y-5" noValidate>
        <p className="text-sm text-muted-foreground">
          أدخل الرمز المرسل إلى{" "}
          <span className="font-semibold text-foreground" dir="ltr">
            {email}
          </span>
        </p>
        <div className="flex justify-center" dir="ltr">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={1} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={2} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={3} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={4} className="h-12 w-11 rounded-lg text-lg" />
              <InputOTPSlot index={5} className="h-12 w-11 rounded-lg text-lg" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-password">كلمة المرور الجديدة</Label>
          <Input
            id="reset-password"
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
        {fieldError && <p className="text-destructive text-sm font-semibold">{fieldError}</p>}
        <Button
          type="submit"
          variant="hero"
          size="xl"
          className="w-full"
          disabled={loading || otp.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري التحديث...
            </>
          ) : (
            "تحديث كلمة المرور"
          )}
        </Button>
        <div className="flex flex-col gap-2 text-center text-sm">
          <button
            type="button"
            className="text-accent font-semibold hover:underline"
            disabled={loading}
            onClick={() => void sendResetOtpToEmail()}
          >
            إعادة إرسال الرمز
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={resetLoginFlow}
          >
            تغيير البريد الإلكتروني
          </button>
        </div>
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
            {mode === "signup"
              ? "ابدأ تجربتك المجانية"
              : mode === "reset"
                ? "إعادة تعيين كلمة المرور"
                : "أهلًا بعودتك"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "signup"
              ? "14 يوم بدون بطاقة ائتمان"
              : mode === "reset"
                ? loginStep === "email"
                  ? "أدخل بريدك لاستلام رمز إعادة التعيين"
                  : "أدخل الرمز وكلمة المرور الجديدة"
                : loginStep === "email"
                  ? "أدخل بريدك لاستلام رمز التحقق"
                  : "أدخل رمز التحقق من بريدك"}
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
            <form onSubmit={onSignup} className="space-y-5" noValidate>
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
              <div className="space-y-2">
                <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                <Input
                  id="signup-email"
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
                  autoComplete="new-password"
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
          ) : mode === "reset" ? (
            resetForm
          ) : (
            loginForm
          )}

          {mode === "login" && (
            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-semibold text-accent hover:underline"
              onClick={() => switchMode("reset")}
            >
              نسيت كلمة المرور؟ أرسل رمز إعادة التعيين
            </button>
          )}

          {mode === "reset" && (
            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => switchMode("login")}
            >
              العودة لتسجيل الدخول
            </button>
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
