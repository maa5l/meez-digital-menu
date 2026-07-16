import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useVenueData } from "@/hooks/useVenueData";
import { ROUTES } from "@/config/app";
import { resolveAppOrigin } from "@/config/env";
import { getPublicSiteHref, getPublicSiteLabel, isIpadTrialMode } from "@/config/ipad-trial";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  MonitorSmartphone,
  Plus,
  Tablet,
} from "lucide-react";

/** تعليمات ربط شاشة الكشk — التفعيل يتطلب الرمز الظاهر على الجهاز */
const LinkDevice = () => {
  const navigate = useNavigate();
  const [venue] = useVenueData();
  const subscription = venue.subscription;
  const used = venue.devices.length;
  const max = subscription.maxScreens;
  const canAdd = used < max;

  const ipadEntryUrl = `${resolveAppOrigin()}${ROUTES.pair}`;
  const siteLabel = getPublicSiteLabel();
  const siteHref = getPublicSiteHref();

  const openActivate = () => {
    if (!canAdd) {
      toast.error(`وصلت للحد الأقصى (${max} شاشة)`);
      return;
    }
    navigate(ROUTES.dashboardDevices, { state: { openActivate: true } });
    toast.info("انسخ الرمز QM-XXXX الظاهر على شاشة الجهاز");
  };

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const title = isIpadTrialMode ? "تطبيق الآيباد" : "ربط شاشة جديدة";
  const badge = isIpadTrialMode ? "نسخة تجريبية" : undefined;

  return (
    <DashboardLayout
      title={title}
      subtitle="الرمز يُولَّد على الجهاز فقط — لا يمكن التفعيل من لوحة التحكم بدون فتح التطبيق"
      action={
        badge ? (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-accent/20 text-accent border border-accent/30">
            {badge}
          </span>
        ) : undefined
      }
    >
      <div className="max-w-2xl space-y-6">
        <div className="bg-card rounded-3xl border border-border p-6 md:p-8 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <MonitorSmartphone className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-primary">خطوات الربط</h2>
              <p className="text-sm text-muted-foreground mt-1">
                متاح {max - used} من {max} شاشة
              </p>
            </div>
          </div>

          <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
            <li>ثبّت تطبيق الكشك على الجهاز (أو افتح صفحة الربط في المتصفح).</li>
            <li>انتظر حتى يظهر الرمز بصيغة QM-XXXX على الشاشة.</li>
            <li>من لوحة التحكم → الأجهزة → تفعيل جهاز — أدخل نفس الرمز.</li>
          </ol>

          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-primary">
            لا يمكن توليد رمز التفعيل من لوحة التحكم. يجب أن يكون التطبيق مفتوحاً على
            الجهاز حتى يُعلِن الرمز للخادم.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="hero" size="lg" onClick={openActivate} disabled={!canAdd}>
              <Plus className="w-5 h-5" />
              تفعيل جهاز (أدخل رمز الشاشة)
            </Button>
            <Button variant="outline" asChild>
              <Link to={ROUTES.dashboardDevices}>← قائمة الأجهزة</Link>
            </Button>
          </div>
        </div>

        {isIpadTrialMode && (
          <div className="bg-card rounded-3xl border border-border p-6 md:p-8 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Tablet className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-primary">رابط التطبيق التجريبي</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  للاختبار عبر WebView — الرمز يظهر بعد الشعار
                </p>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-primary">رابط فتح التطبيق</p>
              <p className="font-mono text-xs break-all text-primary" dir="ltr">
                {ipadEntryUrl}
              </p>
              <p className="text-xs text-muted-foreground">
                الموقع المعروض:{" "}
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
                  معاينة شاشة الربط
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LinkDevice;
