import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { crops as initialCrops, type Crop } from "@/lib/mockData";
import { Plus, Coffee, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const empty: Omit<Crop, "id"> = {
  beanName: "", beanNameEn: "", country: "", countryEn: "",
  process: "", processEn: "", variety: "", altitude: "", notes: "", notesEn: "",
  cardColor: "#D4C9BE", textColor: "#123458", image: "",
};

const Crops = () => {
  const [list, setList] = useState<Crop[]>(initialCrops);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const add = () => {
    if (!form.beanName.trim()) {
      toast.error("اسم البن مطلوب");
      return;
    }
    setList([...list, { ...form, id: `cr-${Date.now()}` }]);
    setForm(empty);
    setOpen(false);
    toast.success("تمت إضافة المحصول");
  };

  const remove = (id: string) => {
    setList(list.filter((c) => c.id !== id));
    toast.success("تم الحذف");
  };

  return (
    <DashboardLayout
      title="محاصيل البن"
      subtitle="مكتبة محاصيل القهوة المعروضة على شاشة الكاشير المخصصة"
      action={
        <div className="flex gap-2">
          <a
            href="/menu?type=crops"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/30 hover:bg-accent/50 text-sm font-bold transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> معاينة الشاشة
          </a>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero"><Plus className="w-4 h-4 ml-1" /> إضافة محصول</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">محصول جديد</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <Field label="اسم البن (عربي)" value={form.beanName} onChange={(v) => setForm({ ...form, beanName: v })} />
                <Field label="اسم البن (English)" value={form.beanNameEn} onChange={(v) => setForm({ ...form, beanNameEn: v })} />
                <Field label="البلد (عربي)" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
                <Field label="Country (English)" value={form.countryEn} onChange={(v) => setForm({ ...form, countryEn: v })} />
                <Field label="نوع المعالجة" value={form.process} onChange={(v) => setForm({ ...form, process: v })} />
                <Field label="Process (English)" value={form.processEn} onChange={(v) => setForm({ ...form, processEn: v })} />
                <Field label="السلالة" value={form.variety} onChange={(v) => setForm({ ...form, variety: v })} />
                <Field label="الارتفاع" value={form.altitude} onChange={(v) => setForm({ ...form, altitude: v })} />
                <Field label="الإيحاءات (عربي)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
                <Field label="Notes (English)" value={form.notesEn} onChange={(v) => setForm({ ...form, notesEn: v })} />
                <ColorPick label="لون البطاقة" value={form.cardColor || "#D4C9BE"} onChange={(v) => setForm({ ...form, cardColor: v })} />
                <ColorPick label="لون الخط" value={form.textColor || "#123458"} onChange={(v) => setForm({ ...form, textColor: v })} />
                <div className="col-span-2 space-y-2">
                  <Label className="text-xs">صورة البطاقة (اختياري)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = () => setForm({ ...form, image: String(r.result) });
                      r.readAsDataURL(f);
                    }}
                    className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-secondary file:font-bold file:text-foreground hover:file:bg-secondary/70"
                  />
                  {form.image && <img src={form.image} alt="" className="h-20 rounded-lg object-cover" />}
                </div>
              </div>
              <Button variant="hero" onClick={add} className="w-full">إضافة المحصول</Button>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => (
          <div key={c.id} className="bg-card rounded-3xl border border-border p-5 relative group">
            <button
              onClick={() => remove(c.id)}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              aria-label="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-accent/30 flex items-center justify-center mb-3">
              <Coffee className="w-6 h-6 text-accent-foreground" />
            </div>
            <div className="font-display font-black text-lg text-primary">{c.beanName}</div>
            <div className="text-xs text-muted-foreground mb-3">{c.beanNameEn}</div>
            <dl className="text-sm space-y-1">
              <Row k="البلد" v={`${c.country} • ${c.countryEn}`} />
              <Row k="المعالجة" v={`${c.process} • ${c.processEn}`} />
              <Row k="السلالة" v={c.variety} />
              <Row k="الارتفاع" v={c.altitude} />
            </dl>
            <div className="mt-3 pt-3 border-t border-border text-xs">
              <div className="text-muted-foreground mb-0.5">الإيحاءات</div>
              <div className="font-bold text-primary">{c.notes}</div>
              <div className="text-muted-foreground">{c.notesEn}</div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <Label className="text-xs">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl" />
  </div>
);

const ColorPick = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-2 border border-border rounded-xl p-1.5 h-11">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-8 rounded cursor-pointer border-0 bg-transparent" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent font-mono text-xs outline-none uppercase" />
    </div>
  </div>
);

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-2">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-bold text-primary text-left">{v}</span>
  </div>
);

export default Crops;