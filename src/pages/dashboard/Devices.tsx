import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { devices as initial, subscription } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Copy, Trash2, MonitorSmartphone, Wifi, WifiOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const Devices = () => {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const generateCode = () => "QM-" + Math.floor(1000 + Math.random() * 9000);

  const add = () => {
    if (!name.trim()) return;
    if (list.length >= subscription.maxScreens) {
      toast.error("وصلت للحد الأقصى. رقّ اشتراكك لإضافة شاشات أخرى.");
      return;
    }
    setList([...list, { id: `d${Date.now()}`, name, code: generateCode(), lastActive: "لم يتم التفعيل بعد", status: "inactive" }]);
    setName("");
    setOpen(false);
  };

  const remove = (id: string) => setList(list.filter((d) => d.id !== id));
  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الرمز");
  };

  const used = list.length;
  const max = subscription.maxScreens;
  const pct = (used / max) * 100;

  return (
    <DashboardLayout
      title="الأجهزة"
      subtitle="أدر الأجهزة المرتبطة بحسابك ورموز التفعيل"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg">
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
                <p className="text-xs text-muted-foreground">سيتم توليد رمز تفعيل تلقائيًا. أدخله في جهاز التابلت لربطه.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="hero" onClick={add}>توليد الرمز</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
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