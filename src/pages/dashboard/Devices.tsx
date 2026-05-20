import { useEffect, useState } from "react";
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
  QrCode,
  Link2,
  RefreshCw,
} from "lucide-react";
import DevicePairingQr from "@/components/device/DevicePairingQr";
import { getDevicePairingUrl } from "@/lib/device-pairing";
import {
  createPairingSession,
  fetchPairingSessionCode,
} from "@/services/device/pairing-session.service";
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
import { deviceActivationCodeSchema } from "@/validations/device.schema";
import { getErrorMessage } from "@/lib/errors";

const Devices = () => {
  const [venue, updateVenue] = useVenueData();
  const list = venue.devices;
  const subscription = venue.subscription;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [menuType, setMenuType] = useState<"products" | "crops">("products");
  const [activationCode, setActivationCode] = useState("");
  const [pairing, setPairing] = useState<{
    sessionId: string;
    code: string | null;
    menuType: "products" | "crops";
  } | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);

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

  const add = () => {
    if (!name.trim()) {
      toast.error("اسم الجهاز مطلوب");
      return;
    }
    if (!activationCode.trim()) {
      toast.error("أدخل رمز التفعيل المعروض على الجهاز");
      return;
    }
    if (list.length >= subscription.maxScreens) {
      toast.error("وصلت للحد الأقصى. رقّ اشتراكك لإضافة شاشات أخرى.");
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
    setPairing(null);
    toast.success("تم تفعيل الجهاز — ستفتح المنيو على الآيباد تلقائياً");
    setOpen(false);
  };

  const remove = (id: string) =>
    updateVenue((v) => ({
      ...v,
      devices: v.devices.filter((d) => d.id !== id),
      subscription: { ...v.subscription, screens: Math.max(0, v.devices.length - 1) },
    }));
  const copy = (text: string, label = "تم النسخ") => {
    void navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const used = list.length;
  const max = subscription.maxScreens;
  const canAddScreen = used < max;
  const pct = max > 0 ? (used / max) * 100 : 0;

  const generatePairing = async () => {
    if (!canAddScreen) {
      toast.error(`وصلت للحد الأقصى (${max} شاشة). رقّ اشتراكك لإضافة المزيد.`);
      return;
    }
    const ownerId = getCurrentUserId();
    if (!ownerId) {
      toast.error("سجّل الدخول أولاً");
      return;
    }

    setPairingLoading(true);
    try {
      const sessionId = await createPairingSession(ownerId);
      setPairing({ sessionId, code: null, menuType: "products" });
      toast.success("امسح QR من الآيباد — سيظهر الرمز على الشاشة");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPairingLoading(false);
    }
  };

  useEffect(() => {
    if (!pairing || pairing.code) return;
    const ownerId = getCurrentUserId();
    if (!ownerId) return;

    const poll = async () => {
      const code = await fetchPairingSessionCode(pairing.sessionId, ownerId);
      if (code) {
        setPairing((prev) => (prev ? { ...prev, code } : prev));
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 1500);
    return () => clearInterval(interval);
  }, [pairing?.sessionId, pairing?.code]);

  const openActivateWithPairing = () => {
    if (!pairing?.code) return;
    if (!canAddScreen) {
      toast.error(`وصلت للحد الأقصى (${max} شاشة)`);
      return;
    }
    setActivationCode(pairing.code);
    setMenuType(pairing.menuType);
    setOpen(true);
  };

  const pairingUrl = pairing ? getDevicePairingUrl(pairing.sessionId) : "";

  return (
    <DashboardLayout
      title="الأجهزة"
      subtitle="أدر الأجهزة المرتبطة بحسابك ورموز التفعيل"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg" disabled={!canAddScreen}>
              <Plus className="w-4 h-4" />
              جهاز جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">جهاز جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>اسم الجهاز</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: طاولة 5" className="h-12 rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label>نوع المنيو</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMenuType("products")}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      menuType === "products" ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"
                    }`}
                  >
                    <Coffee className="w-5 h-5 mb-2 text-accent" />
                    <div className="font-bold text-sm text-primary">منيو المنتجات</div>
                    <div className="text-xs text-muted-foreground">يعرض جميع المنتجات</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuType("crops")}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      menuType === "crops" ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"
                    }`}
                  >
                    <Sprout className="w-5 h-5 mb-2 text-accent" />
                    <div className="font-bold text-sm text-primary">منيو المحاصيل</div>
                    <div className="text-xs text-muted-foreground">محاصيل البن المختص</div>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>رمز التفعيل</Label>
                <Input
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder="QM-XXXX"
                  className="h-12 rounded-xl font-mono text-center text-lg tracking-widest uppercase"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">أدخل الرمز الظاهر على شاشة التابلت</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="hero" onClick={add}>تفعيل الجهاز</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-primary flex items-center gap-2">
              <QrCode className="w-5 h-5 text-accent" />
              ربط آيباد جديد
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              امسح QR من الآيباد — <strong className="text-foreground">الرمز يظهر على شاشة الجهاز فقط</strong>.
              بعدها فعّله هنا (متاح {max - used} من {max} شاشة).
            </p>
          </div>
          <Button
            variant="hero"
            onClick={() => void generatePairing()}
            className="shrink-0"
            disabled={!canAddScreen || pairingLoading}
          >
            <RefreshCw className={`w-4 h-4 ${pairingLoading ? "animate-spin" : ""}`} />
            {pairing ? "جلسة جديدة" : "توليد QR"}
          </Button>
        </div>

        {pairing && (
          <div className="mt-6 grid md:grid-cols-[auto_1fr] gap-6 items-start border-t border-border pt-6">
            <div className="flex flex-col items-center gap-3">
              <DevicePairingQr url={pairingUrl} size={180} />
              <p className="text-[10px] text-muted-foreground text-center">امسح من كاميرا الآيباد</p>
            </div>

            <div className="space-y-4">
              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="text-xs text-muted-foreground mb-1">رمز التفعيل</div>
                {pairing.code ? (
                  <div className="font-mono font-black text-3xl tracking-[0.2em] text-primary" dir="ltr">
                    {pairing.code}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    في انتظار فتح الرابط على الآيباد…
                  </p>
                )}
              </div>

              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5" />
                  رابط الآيباد
                </div>
                <p className="font-mono text-xs text-primary break-all leading-relaxed" dir="ltr">
                  {pairingUrl}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => copy(pairingUrl, "تم نسخ الرابط")}>
                    <Copy className="w-3.5 h-3.5" />
                    نسخ الرابط
                  </Button>
                  {pairing.code && (
                    <Button variant="outline" size="sm" onClick={() => copy(pairing.code!, "تم نسخ الرمز")}>
                      نسخ الرمز
                    </Button>
                  )}
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={openActivateWithPairing}
                    disabled={!pairing.code || !canAddScreen}
                  >
                    تفعيل هذا الرمز
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-w-xs">
                <button
                  type="button"
                  onClick={() => setPairing((p) => (p ? { ...p, menuType: "products" } : p))}
                  className={`p-3 rounded-xl border-2 text-right text-xs transition-all ${
                    pairing.menuType === "products"
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <Coffee className="w-4 h-4 mb-1 text-accent" />
                  منيو المنتجات
                </button>
                <button
                  type="button"
                  onClick={() => setPairing((p) => (p ? { ...p, menuType: "crops" } : p))}
                  className={`p-3 rounded-xl border-2 text-right text-xs transition-all ${
                    pairing.menuType === "crops"
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <Sprout className="w-4 h-4 mb-1 text-accent" />
                  منيو المحاصيل
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage bar */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display font-bold text-primary">استخدام الشاشات</div>
            <div className="text-sm text-muted-foreground">{used} من أصل {max} شاشة</div>
          </div>
          <div className="font-display font-black text-2xl text-accent">{used}/{max}</div>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-gold transition-all" style={{ width: `${pct}%` }} />
        </div>
        {pct >= 80 && (
          <p className="text-xs text-accent font-semibold mt-3">⚠ اقتربت من الحد — فكّر في رفع باقتك</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((d) => (
          <div key={d.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-warm transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${d.status === "active" ? "bg-green-500/15 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                <MonitorSmartphone className="w-5 h-5" />
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${d.status === "active" ? "bg-green-500/15 text-green-700" : "bg-secondary text-muted-foreground"}`}>
                {d.status === "active" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {d.status === "active" ? "متصل" : "غير متصل"}
              </div>
            </div>

            <h3 className="font-display font-bold text-lg text-primary mb-1">{d.name}</h3>
            <p className="text-xs text-muted-foreground mb-4">آخر نشاط: {d.lastActive}</p>

            <div className="bg-secondary rounded-xl p-3 flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">رمز التفعيل</div>
                <div className="font-mono font-black text-lg text-primary tracking-wider">{d.code}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copy(d.code)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => remove(d.id)}>
              <Trash2 className="w-4 h-4" />
              فصل الجهاز
            </Button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Devices;