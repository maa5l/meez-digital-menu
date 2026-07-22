import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVenueData } from "@/hooks/useVenueData";
import type { Crop } from "@/types/domain";
import { Plus, Coffee, Trash2, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { nextSortOrder, sortCatalogManual } from "@/lib/catalog-order";

const empty: Omit<Crop, "id"> = {
  beanName: "",
  beanNameEn: "",
  country: "",
  countryEn: "",
  process: "",
  processEn: "",
  variety: "",
  altitude: "",
  notes: "",
  notesEn: "",
  cardColor: "#D4C9BE",
  textColor: "#3068A8",
  image: "",
  imageLandscape: "",
  imagePortrait: "",
  bgType: "color",
  gradientColors: ["#D4C9BE", "#3068A8", "#030303"],
  sortOrder: undefined,
};

function cropToForm(c: Crop): Omit<Crop, "id"> {
  const { id: _id, ...rest } = c;
  const landscape = rest.imageLandscape?.trim() || rest.image?.trim() || "";
  return {
    ...empty,
    ...rest,
    cardColor: rest.cardColor || empty.cardColor,
    textColor: rest.textColor || empty.textColor,
    image: landscape,
    imageLandscape: landscape,
    imagePortrait: rest.imagePortrait?.trim() || "",
    bgType: rest.bgType || "color",
    gradientColors: rest.gradientColors?.length
      ? rest.gradientColors
      : [...(empty.gradientColors || [])],
  };
}

const Crops = () => {
  const [venue, updateVenue] = useVenueData();
  const list = venue.crops;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const isEditing = editingId !== null;

  const reset = () => {
    setEditingId(null);
    setForm(empty);
  };

  const openCreate = () => {
    reset();
    setForm({ ...empty, sortOrder: nextSortOrder(list) });
    setOpen(true);
  };

  const openEdit = (c: Crop) => {
    setEditingId(c.id);
    setForm(cropToForm(c));
    setOpen(true);
  };

  const handleDialogChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const save = () => {
    if (!form.beanName.trim()) {
      toast.error("اسم المحصول مطلوب");
      return;
    }

    const landscape = form.imageLandscape?.trim() || form.image?.trim() || "";
    const portrait = form.imagePortrait?.trim() || "";
    const payload: Omit<Crop, "id"> = {
      ...form,
      imageLandscape: landscape || undefined,
      imagePortrait: portrait || undefined,
      // توافق مع القوالب القديمة التي تقرأ image فقط
      image: landscape || portrait || undefined,
      sortOrder:
        typeof form.sortOrder === "number" && Number.isFinite(form.sortOrder)
          ? form.sortOrder
          : undefined,
    };

    if (isEditing && editingId) {
      updateVenue((v) => ({
        ...v,
        crops: v.crops.map((c) => (c.id === editingId ? { ...payload, id: editingId } : c)),
      }));
      toast.success("تم حفظ تعديلات المحصول");
    } else {
      updateVenue((v) => ({
        ...v,
        crops: [...v.crops, { ...payload, id: `cr-${Date.now()}` }],
      }));
      toast.success("تمت إضافة المحصول");
    }

    reset();
    setOpen(false);
  };

  const remove = (id: string) => {
    updateVenue((v) => ({ ...v, crops: v.crops.filter((c) => c.id !== id) }));
    toast.success("تم الحذف");
  };

  return (
    <SubscriptionGuard requireEdit>
      <DashboardLayout
        title="محاصيل البن"
        subtitle="مكتبة محاصيل القهوة المعروضة على شاشة الكاشير المخصصة"
        action={
          <div className="flex gap-2">
            <a
              href="/menu?type=crops&preview=1"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/30 hover:bg-accent/50 text-sm font-bold transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> معاينة الشاشة
            </a>
            <Button variant="hero" onClick={openCreate}>
              <Plus className="w-4 h-4 ml-1" /> إضافة محصول
            </Button>
          </div>
        }
      >
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {isEditing ? "تعديل محصول" : "محصول جديد"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="اسم المحصول (عربي)"
                value={form.beanName}
                onChange={(v) => setForm({ ...form, beanName: v })}
              />
              <Field
                label="اسم المحصول (English)"
                value={form.beanNameEn}
                onChange={(v) => setForm({ ...form, beanNameEn: v })}
              />
              <div className="space-y-2">
                <Label className="text-xs">رقم الترتيب</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.sortOrder ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({
                      ...form,
                      sortOrder: v.trim() === "" ? undefined : Number(v),
                    });
                  }}
                  placeholder="1 = أولاً"
                  className="h-11 rounded-xl"
                  dir="ltr"
                />
                <p className="text-[11px] text-muted-foreground">الأصغر يظهر أولاً عند الترتيب اليدوي في الثيم</p>
              </div>
              <Field
                label="البلد (عربي)"
                value={form.country}
                onChange={(v) => setForm({ ...form, country: v })}
              />
              <Field
                label="Country (English)"
                value={form.countryEn}
                onChange={(v) => setForm({ ...form, countryEn: v })}
              />
              <Field
                label="نوع المعالجة"
                value={form.process}
                onChange={(v) => setForm({ ...form, process: v })}
              />
              <Field
                label="Process (English)"
                value={form.processEn}
                onChange={(v) => setForm({ ...form, processEn: v })}
              />
              <Field
                label="السلالة"
                value={form.variety}
                onChange={(v) => setForm({ ...form, variety: v })}
              />
              <Field
                label="الارتفاع"
                value={form.altitude}
                onChange={(v) => setForm({ ...form, altitude: v })}
              />
              <Field
                label="الإيحاءات (عربي)"
                value={form.notes}
                onChange={(v) => setForm({ ...form, notes: v })}
              />
              <Field
                label="Notes (English)"
                value={form.notesEn}
                onChange={(v) => setForm({ ...form, notesEn: v })}
              />
              <ColorPick
                label="لون الخط"
                value={form.textColor || "#3068A8"}
                onChange={(v) => setForm({ ...form, textColor: v })}
              />
              <div className="col-span-2 space-y-2 border border-border rounded-2xl p-3 bg-secondary/30">
                <Label className="text-xs">خلفية البطاقة</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["color", "gradient", "image"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, bgType: t })}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        form.bgType === t
                          ? "bg-accent text-accent-foreground"
                          : "bg-card text-muted-foreground"
                      }`}
                    >
                      {t === "color" ? "لون" : t === "gradient" ? "تدرّج" : "صورة"}
                    </button>
                  ))}
                </div>

                {form.bgType === "color" && (
                  <ColorPick
                    label="لون البطاقة"
                    value={form.cardColor || "#D4C9BE"}
                    onChange={(v) => setForm({ ...form, cardColor: v })}
                  />
                )}

                {form.bgType === "gradient" && (
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((i) => (
                      <ColorPick
                        key={i}
                        label={`لون ${i + 1}`}
                        value={form.gradientColors?.[i] || "#ffffff"}
                        onChange={(v) => {
                          const next = [...(form.gradientColors || ["#fff", "#fff", "#fff"])];
                          next[i] = v;
                          setForm({ ...form, gradientColors: next });
                        }}
                      />
                    ))}
                  </div>
                )}

                {form.bgType === "image" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <ImageUploadSlot
                      label="صورة عرضية"
                      hint="بانر أفقي — خلفية البطاقة وتفاصيل العرض"
                      previewClassName="h-24 w-full rounded-lg object-cover"
                      value={form.imageLandscape || form.image}
                      onChange={(dataUrl) =>
                        setForm({
                          ...form,
                          imageLandscape: dataUrl,
                          image: dataUrl,
                        })
                      }
                      onClear={() =>
                        setForm({
                          ...form,
                          imageLandscape: "",
                          image: form.imagePortrait || "",
                        })
                      }
                    />
                    <ImageUploadSlot
                      label="صورة عمودية"
                      hint="صورة طويلة منفصلة تظهر في تفاصيل المحصول"
                      previewClassName="mx-auto h-36 w-28 rounded-lg object-cover"
                      value={form.imagePortrait}
                      onChange={(dataUrl) => setForm({ ...form, imagePortrait: dataUrl })}
                      onClear={() => setForm({ ...form, imagePortrait: "" })}
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                إلغاء
              </Button>
              <Button variant="hero" onClick={save}>
                {isEditing ? "حفظ التعديلات" : "إضافة المحصول"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortCatalogManual(list).map((c) => (
            <div key={c.id} className="bg-card rounded-3xl border border-border p-5 relative group">
              <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="w-8 h-8 rounded-full bg-accent/20 text-primary flex items-center justify-center hover:bg-accent/40"
                  aria-label={`تعديل ${c.beanName}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"
                  aria-label="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-accent/30 flex items-center justify-center mb-3">
                <Coffee className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="font-display font-black text-lg text-primary">
                {c.sortOrder != null && (
                  <span className="me-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-secondary px-1 text-[10px] font-black text-muted-foreground align-middle">
                    #{c.sortOrder}
                  </span>
                )}
                {c.beanName}
              </div>
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
    </SubscriptionGuard>
  );
};

const Field = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-2">
    <Label className="text-xs">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl" />
  </div>
);

const ImageUploadSlot = ({
  label,
  hint,
  value,
  previewClassName,
  onChange,
  onClear,
}: {
  label: string;
  hint: string;
  value?: string;
  previewClassName: string;
  onChange: (dataUrl: string) => void;
  onClear: () => void;
}) => (
  <div className="space-y-2 rounded-xl border border-border bg-card/60 p-3">
    <Label className="text-xs font-bold">{label}</Label>
    <p className="text-[11px] text-muted-foreground leading-relaxed">{hint}</p>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => onChange(String(r.result));
        r.readAsDataURL(f);
        e.target.value = "";
      }}
      className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-secondary file:font-bold file:text-foreground"
    />
    {value ? (
      <div className="space-y-2">
        <img src={value} alt="" className={previewClassName} />
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClear}>
          إزالة الصورة
        </Button>
      </div>
    ) : null}
  </div>
);

const ColorPick = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-2">
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-2 border border-border rounded-xl p-1.5 h-11">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-8 rounded cursor-pointer border-0 bg-transparent"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent font-mono text-xs outline-none uppercase"
      />
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
