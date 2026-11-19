import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/app";
import { getAuthFormErrorMessage } from "@/lib/errors";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { completePasswordReset, syncSessionFromSupabase } from "@/services/auth/auth.service";
import { resolvePostAuthRoute } from "@/services/admin/admin.service";
import { checkRateLimit } from "@/security/rate-limit";
import { RateLimitError } from "@/lib/errors";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setFieldError("خدمة الحسابات غير جاهزة حالياً.");
      return;
    }

    const supabase = getSupabase();
    let active = true;

    const markReady = () => {
      if (active) setReady(true);
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        syncSessionFromSupabase(data.session);
        markReady();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        syncSessionFromSupabase(session);
        markReady();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    if (password.length < 8) {
      setFieldError("كلمة المرور 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setFieldError("كلمتا المرور غير متطابقتين");
      return;
    }

    const rate = checkRateLimit("auth:reset-confirm", 8, 60_000);
    if (!rate.allowed) {
      setFieldError(new RateLimitError(rate.retryAfterMs).message);
      return;
    }

    setLoading(true);
    try {
      await completePasswordReset(password);
      toast.success("تم تعيين كلمة المرور الجديدة");
      const destination = await resolvePostAuthRoute(ROUTES.dashboard);
      navigate(destination, { replace: true });
    } catch (error) {
      setFieldError(getAuthFormErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background" dir="rtl">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center text-primary">
          <Logo className="h-9 w-auto aspect-[1031/736]" />
        </Link>

        <h1 className="font-display font-black text-3xl text-primary mb-2">تعيين كلمة مرور جديدة</h1>
        <p className="text-muted-foreground mb-8">
          {ready
            ? "أدخل كلمة المرور الجديدة لحسابك"
            : "افتح الرابط من رسالة البريد أولاً، ثم عيّن كلمة المرور هنا"}
        </p>

        {!ready ? (
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-5 text-sm text-muted-foreground space-y-3">
            <p>لم نرصد جلسة استعادة بعد.</p>
            <p>ارجع إلى بريدك واضغط زر «تعيين كلمة المرور» في الرسالة.</p>
            <Link
              to={`${ROUTES.auth}?mode=forgot`}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-bold text-primary hover:bg-secondary"
            >
              إعادة إرسال الرابط
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-12 rounded-xl pe-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 px-3 text-muted-foreground hover:text-primary"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="h-12 rounded-xl pe-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 px-3 text-muted-foreground hover:text-primary"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {fieldError && <p className="text-destructive text-sm font-semibold">{fieldError}</p>}

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ كلمة المرور"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
