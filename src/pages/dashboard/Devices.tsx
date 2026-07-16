import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useVenueData } from "@/hooks/useVenueData";
import {
  getCurrentUserId,
  inferDeviceMenuType,
  linkDeviceToOwner,
  refreshDeviceVenueSync,
  setDeviceMenuType,
  syncDeviceLinks,
  syncDeviceActivationsToCloud,
} from "@/lib/venue-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Copy,
  Trash2,
  MonitorSmartphone,
  Wifi,
  WifiOff,
  Coffee,
  Sprout,
  KeyRound,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { activateDevice } from "@/services/device/activation";
import {
  removeDeviceActivationFromDatabase,
  shouldUseVenueDatabase,
  syncOwnerDevicesFromCloud,
} from "@/services/venue/venue-supabase.service";
import { deactivateAllOwnerDevicesRpc } from "@/services/core/platform-security";
import { activateDeviceWithLicense } from "@/services/subscription/subscription-enforcement";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { notifySubscriptionUpdated } from "@/hooks/useSubscription";
import { deviceActivationCodeSchema } from "@/validations/device.schema";
import { getErrorMessage } from "@/lib/errors";
import { ROUTES } from "@/config/app";
import { isIpadTrialMode } from "@/config/ipad-trial";
import { getPendingVerification, clearPendingVerification } from "@/lib/pending-verification";
import { ensureOwnerVerificationSession } from "@/services/device/verification-code.service";
import { logger } from "@/lib/logger";

type ActivateNavState = {
  activationCode?: string;
  menuType?: "products" | "crops";
  openActivate?: boolean;
};

const Devices = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [venue, updateVenue] = useVenueData();
  const { access } = useSubscription();
  const list = venue.devices;
  const subscription = venue.subscription;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [menuType, setMenuType] = useState<"products" | "crops">("products");
  const [activationCode, setActivationCode] = useState("");
  const [removingAll, setRemovingAll] = useState(false);

  useEffect(() => {
    const nav = location.state as ActivateNavState | null;
    const pending = getPendingVerification();
    const code = nav?.activationCode ?? pending?.code;
    const type = nav?.menuType ?? pending?.menuType ?? "products";

    if (code && (nav?.openActivate || pending)) {
      setActivationCode(code);
      setMenuType(type);
      setOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!shouldUseVenueDatabase()) return;
    void syncOwnerDevicesFromCloud(updateVenue).then(() => notifySubscriptionUpdated());
  }, [updateVenue]);

  useEffect(() => {
    const ownerId = getCurrentUserId();
    if (!ownerId || list.length === 0) return;
    syncDeviceLinks(
      list.map((d) => d.code),
      ownerId,
    );
    for (const d of list) {
      setDeviceMenuType(d.code, inferDeviceMenuType(d));
      refreshDeviceVenueSync(d.code, ownerId);
    }
    void syncDeviceActivationsToCloud(ownerId, list);
  }, [list]);

  const add = async () => {
    if (!name.trim()) {
      toast.error("اسم الجهاز مطلوب");
      return;
    }
    if (!activationCode.trim()) {
      toast.error("أدخل كود التحقق");
      return;
    }
    if (!access.can_add_devices) {
      toast.error(
        access.active_device_count >= access.screen_count
          ? "وصلت لحد الشاشات المرخصة. رقّ اشتراكك لإضافة شاشات."
          : "لا يمكن إضافة أجهزة في حالة الاشتراك الحالية.",
      );
      return;
    }
    if (list.some((d) => d.code === activationCode.trim().toUpperCase())) {
      toast.error("هذا الرمز مفعّل مسبقاً");
      return;
    }
    const parsed = deviceActivationCodeSchema.safeParse({ code: activationCode });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "رمز غير صالح");
      return;
    }

    if (!shouldUseVenueDatabase()) {
      toast.error(
        "Supabase غير مضبوط — التفعيل يبقى في المتصفح فقط ولن يراه تطبيق الكشك. راجع VITE_SUPABASE_* في .env.local",
      );
      return;
    }

    try {
      const ownerId = getCurrentUserId();
      if (!ownerId) {
        toast.error("سجّل الدخول أولاً");
        return;
      }

      const ensure = await ensureOwnerVerificationSession(parsed.data.code, ownerId);
      logger.info("devices.activate_verification", {
        inputCode: parsed.data.code,
        normalizedCode: ensure.normalizedCode,
        ok: ensure.ok,
        reason: ensure.reason,
        dbSessions: ensure.dbSessions,
      });

      if (!ensure.ok) {
        const hadExpired =
          ensure.dbSessions?.some((s) => s.expired) && !ensure.dbSessions.some((s) => !s.expired);
        toast.error(
          ensure.reason === "invalid_format"
            ? "صيغة الرمز غير صحيحة — استخدم QM-XXXX"
            : ensure.reason === "device_not_announced"
              ? "افتح تطبيق الكشك على الجهاز أولاً — الرمز يجب أن يظهر على الشاشة قبل التفعيل"
              : hadExpired
                ? "انتهت صلاحية الرمز السابق — أعد إدخال الرمز من الجهاز"
                : "تعذّر تجهيز كود التحقق — تأكد من الرمز الظاهر على الجهاز وحاول مرة أخرى",
        );
        return;
      }

      const result = await activateDeviceWithLicense(
        ensure.normalizedCode,
        menuType,
        name.trim(),
      );
      if (!result.ok) {
        const msg =
          result.error === "screen_limit_exceeded"
            ? "وصلت لحد الشاشات المرخصة"
            : result.error === "code_already_claimed"
              ? "هذا الرمز مربوط بحساب آخر ولا يمكن إعادة استخدامه"
              : result.error === "verification_code_invalid"
                ? "كود التحقق غير صالح — أعد المحاولة بعد فتح التطبيق على الجهاز"
                : result.error === "device_not_announced"
                  ? "افتح تطبيق الكشك على الجهاز أولاً — الرمز يجب أن يظهر على الشاشة"
                  : result.error === "subscription_inactive"
                  ? "الاشتراك غير نشط"
                  : result.error === "not_authenticated"
                    ? "سجّل الدخول أولاً"
                    : typeof result.error === "string" && result.error.length > 0
                      ? result.error
                      : "تعذّر تفعيل الجهاز";
        toast.error(msg);
        return;
      }

      notifySubscriptionUpdated();
      await syncOwnerDevicesFromCloud(updateVenue);
      activateDevice(parsed.data.code, { menuType });
      linkDeviceToOwner(parsed.data.code, ownerId);
      setDeviceMenuType(parsed.data.code, menuType);

      setName("");
      setActivationCode("");
      setMenuType("products");
      clearPendingVerification();
      toast.success("تم التفعيل في Supabase — انتظر ثوانٍ على شاشة الكشك");
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const remove = async (id: string) => {
    const device = list.find((d) => d.id === id);
    if (!device) return;

    try {
      if (device.code.trim() && shouldUseVenueDatabase()) {
        await removeDeviceActivationFromDatabase(device.code);
      }
      updateVenue((v) => ({
        ...v,
        devices: v.devices.filter((d) => d.id !== id),
        subscription: { ...v.subscription, screens: Math.max(0, v.devices.length - 1) },
      }));
      notifySubscriptionUpdated();
      toast.success("تم فصل الجهاز");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeAll = async () => {
    if (list.length === 0) return;
    if (!window.confirm("فصل جميع الأجهزة النشطة؟ لن تُحذف السجلات من النظام لكن ستختفي من القائمة.")) {
      return;
    }

    setRemovingAll(true);
    try {
      if (shouldUseVenueDatabase()) {
        const result = await deactivateAllOwnerDevicesRpc();
        if (!result.ok) {
          toast.error(result.error ?? "تعذّر فصل الأجهزة");
          return;
        }
        await syncOwnerDevicesFromCloud(updateVenue);
      } else {
        updateVenue((v) => ({
          ...v,
          devices: [],
          subscription: { ...v.subscription, screens: 0 },
        }));
      }
      notifySubscriptionUpdated();
      toast.success("تم فصل جميع الأجهزة");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemovingAll(false);
    }
  };

  const copy = (text: string, label = "تم النسخ") => {
    void navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const used = Math.max(access.active_device_count, list.filter((d) => d.status === "active").length);
  const max = access.screen_count || subscription.maxScreens;
  const canAddScreen = access.can_add_devices;
  const pct = max > 0 ? (used / max) * 100 : 0;
  const cloudReady = shouldUseVenueDatabase();

  return (
    <SubscriptionGuard requireAddDevices>
    <DashboardLayout
      title="الأجهزة"
      subtitle={
        isIpadTrialMode
          ? "أدر الشاشات وفعّل الآيباد من تطبيق الآيباد"
          : "أدر الشاشات المفعّلة واربط أجهزة جديدة بكود التحقق"
      }
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg" disabled={!canAddScreen || !cloudReady}>
              <Plus className="w-4 h-4" />
              تفعيل جهاز
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">تفعيل جهاز</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>اسم الجهاز</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: طاولة 5"
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>نوع المنيو</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMenuType("products")}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      menuType === "products"
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    <Coffee className="w-5 h-5 mb-2 text-accent" />
                    <div className="font-bold text-sm text-primary">منيو المنتجات</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuType("crops")}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      menuType === "crops"
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    <Sprout className="w-5 h-5 mb-2 text-accent" />
                    <div className="font-bold text-sm text-primary">منيو المحاصيل</div>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isIpadTrialMode ? "رمز الآيباد" : "رمز الجهاز"}</Label>
                <Input
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder="QM-XXXX"
                  className="h-12 rounded-xl font-mono text-center text-lg tracking-widest uppercase"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  انسخ الرمز الظاهر على شاشة تطبيق الكشك —{" "}
                  <Link to={ROUTES.dashboardLinkDevice} className="text-accent underline">
                    تعليمات الربط
                  </Link>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="hero" onClick={() => void add()}>
                تفعيل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {!cloudReady && (
        <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 flex gap-3 text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold">Supabase غير مضبوط — التفعيل لا يصل لتطبيق الكشك</p>
            <p className="opacity-90">
              ضع <span dir="ltr">VITE_SUPABASE_URL</span> و{" "}
              <span dir="ltr">VITE_SUPABASE_ANON_KEY</span> الحقيقيين في{" "}
              <span dir="ltr">.env.local</span> ثم أعد تشغيل{" "}
              <span dir="ltr">npm run dev</span>.
            </p>
          </div>
        </div>
      )}

      <Link
        to={ROUTES.dashboardLinkDevice}
        className="block bg-gradient-hero text-primary-foreground rounded-2xl p-6 mb-6 hover:shadow-warm transition-shadow"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/25 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">ربط شاشة جديدة</h2>
              <p className="text-sm opacity-80">
                {isIpadTrialMode
                  ? "افتح التطبيق على الجهاز — انسخ الرمز من الشاشة ثم فعّله هنا"
                  : "افتح تطبيق الكشك على الجهاز — انسخ الرمز من الشاشة ثم فعّله هنا"}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 font-bold text-accent shrink-0">
            {isIpadTrialMode ? "تطبيق الآيباد" : "كود التحقق"}
            <ArrowLeft className="w-4 h-4" />
          </span>
        </div>
      </Link>

      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display font-bold text-primary">استخدام الشاشات</div>
            <div className="text-sm text-muted-foreground">
              {used} من أصل {max} شاشة
            </div>
          </div>
          <div className="flex items-center gap-3">
            {list.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={removingAll}
                onClick={() => void removeAll()}
              >
                <Trash2 className="w-4 h-4" />
                فصل الكل
              </Button>
            )}
            <div className="font-display font-black text-2xl text-accent">
              {used}/{max}
            </div>
          </div>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-gold transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((d) => (
          <div
            key={d.id}
            className="bg-card rounded-2xl border border-border p-5 hover:shadow-warm transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  d.status === "active"
                    ? "bg-green-500/15 text-green-600"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <MonitorSmartphone className="w-5 h-5" />
              </div>
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${
                  d.status === "active"
                    ? "bg-green-500/15 text-green-700"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {d.status === "active" ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                {d.status === "active" ? "متصل" : "غير متصل"}
              </div>
            </div>

            <h3 className="font-display font-bold text-lg text-primary mb-1">{d.name}</h3>
            <p className="text-xs text-muted-foreground mb-4">آخر نشاط: {d.lastActive}</p>

            <div className="bg-secondary rounded-xl p-3 flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">كود التحقق</div>
                <div className="font-mono font-black text-lg text-primary tracking-wider">{d.code}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copy(d.code)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => remove(d.id)}
            >
              <Trash2 className="w-4 h-4" />
              فصل الجهاز
            </Button>
          </div>
        ))}
      </div>
    </DashboardLayout>
    </SubscriptionGuard>
  );
};

export default Devices;
