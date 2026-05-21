import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useVenueData } from "@/hooks/useVenueData";
import { getCurrentUserId } from "@/lib/venue-store";
import {
  createVerificationCode,
  rememberVerificationCode,
} from "@/services/device/verification-code.service";
import { getDevicePairingUrlWithCode } from "@/lib/device-pairing";
import { ROUTES } from "@/config/app";
import { resolveAppOrigin } from "@/config/env";
import { getPublicSiteHref, getPublicSiteLabel, isIpadTrialMode } from "@/config/ipad-trial";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import {
  Copy,
  Coffee,
  ExternalLink,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  Sprout,
  Tablet,
} from "lucide-react";

/** لوحة تطبيق الآيباد (تجريبي) — بديل مؤقت لصفحة كود التحقق */
const LinkDevice = () => {
  const navigate = useNavigate();
  const [venue] = useVenueData();
  const subscription = venue.subscription;
  const used = venue.devices.length;
  const max = subscription.maxScreens;
  const canAdd = used < max;

  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuType, setMenuType] = useState<"products" | "crops">("products");

  const ipadEntryUrl = `${resolveAppOrigin()}${ROUTES.pair}`;
  const siteLabel = getPublicSiteLabel();
  const siteHref = getPublicSiteHref();
  const deviceUrl = code ? getDevicePairingUrlWithCode(code) : ipadEntryUrl;

  const generate = async () => {
    if (!canAdd) {
      toast.error(`وصلت للحد الأقصى (${max} شاشة)`);
      return;
    }
    const ownerId = getCurrentUserId();
    if (!ownerId) {
      toast.error("سجّل الدخول أولاً");
      return;
    }

    setLoading(true);
    try {
      const result = await createVerificationCode(ownerId);
      setCode(result.code);
      rememberVerificationCode(result.code, menuType);
      toast.success("تم توليد الرمز — أدخله في تفعيل الجهاز أو افتح الرابط على الآيباد");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const openActivate = (activationCode?: string) => {
    const c = activationCode ?? code;
    if (!c && isIpadTrialMode) {
      navigate(ROUTES.dashboardDevices, { state: { openActivate: true } });
      toast.info("أدخل الرمز الظاهر على شاشة الآيباد");
      return;
    }
    if (!c) return;
    rememberVerificationCode(c, menuType);
    navigate(ROUTES.dashboardDevices, {
      state: { activationCode: c, menuType, openActivate: true },
    });
  };

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const title = isIpadTrialMode ? "تطبيق الآيباد" : "كود التحقق";
  const badge = isIpadTrialMode ? "نسخة تجريبية" : undefined;

  return (
    <DashboardLayout
      title={title}
      subtitle={
        isIpadTrialMode
          ? "مؤقت حتى اعتماد التطبيق — الرمز يظهر على الآيباد والتفعيل من هنا"
          : "الكود يظهر هنا — التفعيل من زر «تفعيل الجهاز»"
      }
      action={
        badge ? (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-accent/20 text-accent border border-accent/30">
            {badge}
          </span>
        ) : undefined
      }
    >
      <div className="max-w-2xl space-y-6">
        {isIpadTrialMode && (
          <div className="bg-card rounded-3xl border border-border p-6 md:p-8 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Tablet className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-primary">شاشة الآيباد</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  التطبيق يفتح: الشعار → رمز التفعيل → رابط الموقع أسفل الشاشة
                </p>
              </div>
            </div>

            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>اضبط تطبيق الآيباد ليفتح الرابط أدناه (أو صفحة /pair).</li>
              <li>سيظهر رمز على الشاشة — انسخه أو ولّد رمزاً من هنا.</li>
              <li>اضغط «تفعيل الجهاز» وأدخل الرمز نفسه.</li>
            </ol>

            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-primary">رابط فتح التطبيق (WebView)</p>
              <p className="font-mono text-xs break-all text-primary" dir="ltr">
                {ipadEntryUrl}
              </p>
              <p className="text-xs text-muted-foreground">
                الموقع المعروض على الآيباد:{" "}
                <a href={siteHref} className="text-accent underline" dir="ltr">
                  {siteLabel}
                </a>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => copy(ipadEntryUrl, "تم نسخ رابط التطبيق")}>
                <Copy className="w-4 h-4" />
                نسخ رابط التطبيق
              </Button>
              <Button variant="outline" asChild>
                <a href={`${ROUTES.pair}?preview=1`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  معاينة شاشة الآيباد
                </a>
              </Button>
              <Button variant="hero" onClick={() => openActivate()}>
                <Plus className="w-5 h-5" />
                تفعيل الجهاز (أدخل رمز الآيباد)
              </Button>
            </div>
          </div>
        )}

        <div className="bg-card rounded-3xl border border-border p-6 md:p-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <MonitorSmartphone className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-primary">
                {isIpadTrialMode ? "رمز من لوحة التحكم (اختياري)" : "كود التحقق"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                متاح {max - used} من {max} شاشة
                {!isIpadTrialMode && " · صالح 30 دقيقة"}
              </p>
            </div>
          </div>

          {!code ? (
            <Button
              variant="hero"
              size="lg"
              onClick={() => void generate()}
              disabled={!canAdd || loading}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              {isIpadTrialMode ? "توليد رمز للتفعيل" : "توليد كود تحقق"}
            </Button>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-hero text-primary-foreground rounded-2xl p-8 text-center shadow-warm">
                <p className="text-xs uppercase tracking-widest opacity-70 mb-3">رمز التفعيل</p>
                <p
                  className="font-mono font-black text-5xl md:text-6xl tracking-[0.2em]"
                  dir="ltr"
                >
                  {code}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMenuType("products");
                    rememberVerificationCode(code, "products");
                  }}
                  className={`p-4 rounded-xl border-2 text-right transition-all ${
                    menuType === "products" ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <Coffee className="w-5 h-5 mb-2 text-accent" />
                  <div className="font-bold text-sm">منيو المنتجات</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuType("crops");
                    rememberVerificationCode(code, "crops");
                  }}
                  className={`p-4 rounded-xl border-2 text-right transition-all ${
                    menuType === "crops" ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <Sprout className="w-5 h-5 mb-2 text-accent" />
                  <div className="font-bold text-sm">منيو المحاصيل</div>
                </button>
              </div>

              {!isIpadTrialMode && (
                <div className="bg-secondary/40 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">رابط الشاشة مع الرمز:</p>
                  <p className="font-mono text-xs break-all text-primary" dir="ltr">
                    {deviceUrl}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="hero" size="lg" onClick={() => openActivate(code)} disabled={!canAdd}>
                  <Plus className="w-5 h-5" />
                  تفعيل الجهاز
                </Button>
                <Button variant="outline" onClick={() => copy(code, "تم نسخ الرمز")}>
                  <Copy className="w-4 h-4" />
                  نسخ الرمز
                </Button>
                {!isIpadTrialMode && (
                  <Button variant="outline" onClick={() => copy(deviceUrl, "تم نسخ رابط الشاشة")}>
                    <ExternalLink className="w-4 h-4" />
                    نسخ رابط الشاشة
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => void generate()}
                  disabled={loading || !canAdd}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  رمز جديد
                </Button>
              </div>
            </div>
          )}
        </div>

        <Link
          to={ROUTES.dashboardDevices}
          className="inline-flex text-sm text-accent font-semibold hover:underline"
        >
          ← قائمة الأجهزة
        </Link>
      </div>
    </DashboardLayout>
  );
};

export default LinkDevice;
