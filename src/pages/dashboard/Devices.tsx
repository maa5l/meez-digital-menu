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
import { removeDeviceActivationFromDatabase } from "@/services/venue/venue-supabase.service";
import { activateDeviceWithLicense } from "@/services/subscription/subscription-enforcement";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { notifySubscriptionUpdated } from "@/hooks/useSubscription";
import { deviceActivationCodeSchema } from "@/validations/device.schema";
import { getErrorMessage } from "@/lib/errors";
import { ROUTES } from "@/config/app";
import { isIpadTrialMode } from "@/config/ipad-trial";
import { getPendingVerification, clearPendingVerification } from "@/lib/pending-verification";
import { verifyOwnerVerificationCode } from "@/services/device/verification-code.service";

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

    try {
      if (shouldUseVenueDatabase()) {
        const codeValid = await verifyOwnerVerificationCode(parsed.data.code);
        if (!codeValid) {
          toast.error(
            "كود التحقق غير صالح. أنشئ كوداً جديداً من لوحة التحكم → كود التحقق ثم أعد التفعيل.",
          );
          return;
        }

        const result = await activateDeviceWithLicense(
          parsed.data.code,
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
                  ? "كود التحقق غير صالح — ولّد كوداً من «كود التحقق» أولاً"
                  : result.error === "subscription_inactive"
                  ? "الاشتراك غير نشط"
                  : "تعذّر تفعيل الجهاز";
          toast.error(msg);
          return;
        }
        notifySubscriptionUpdated();
      }
      activateDevice(parsed.data.code, { menuType });
    } catch (error) {
      toast.error(getErrorMessage(error));
      return;
    }

    const ownerId = getCurrentUserId();
    if (ownerId) {
      linkDeviceToOwner(parsed.data.code, ownerId);
      setDeviceMenuType(parsed.data.code, menuType);
    }

    const newDevice = {
      id: `d${Date.now()}`,
      name: `${name} · ${menuType === "crops" ? "محاصيل" : "منتجات"}`,
      code: parsed.data.code,
      menuType,
      lastActive: "تم التفعيل الآن",
      status: "active" as const,
    };

    updateVenue((v) => ({
      ...v,
      devices: [...v.devices, newDevice],
      subscription: { ...v.subscription, screens: v.devices.length + 1 },
    }));
    setName("");
    setActivationCode("");
    setMenuType("products");
    clearPendingVerification();
    toast.success("تم تفعيل الجهاز — ستفتح المنيو على الشاشة تلقائياً");
    setOpen(false);
  };

  const remove = (id: string) => {
    const device = list.find((d) => d.id === id);
    if (device?.code.trim()) {
      void removeDeviceActivationFromDatabase(device.code);
    }
    updateVenue((v) => ({
      ...v,
      devices: v.devices.filter((d) => d.id !== id),
      subscription: { ...v.subscription, screens: Math.max(0, v.devices.length - 1) },
    }));
  };

  const copy = (text: string, label = "تم النسخ") => {
    void navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const used = access.active_device_count || list.length;
  const max = access.screen_count || subscription.maxScreens;
  const canAddScreen = access.can_add_devices;
  const pct = max > 0 ? (used / max) * 100 : 0;

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
            <Button variant="hero" size="lg" disabled={!canAddScreen}>
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
                <Label>{isIpadTrialMode ? "رمز الآيباد" : "كود التحقق"}</Label>
                <Input
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder="QM-XXXX"
                  className="h-12 rounded-xl font-mono text-center text-lg tracking-widest uppercase"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  الرمز من{" "}
                  <Link to={ROUTES.dashboardLinkDevice} className="text-accent underline">
                    {isIpadTrialMode ? "تطبيق الآيباد" : "كود التحقق"}
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
                  ? "الرمز يظهر على شاشة الآيباد — فعّله هنا بنفس الرمز"
                  : "ولّد كود تحقق — أدخله على الجهاز ثم فعّله هنا"}
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
          <div className="font-display font-black text-2xl text-accent">
            {used}/{max}
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
