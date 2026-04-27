import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { categories, products as initial, type Product } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, ImageIcon, Sprout } from "lucide-react";

const Products = () => {
  const [list, setList] = useState(initial);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [calories, setCalories] = useState("");
  const [image, setImage] = useState("");
  const [hasCrop, setHasCrop] = useState(false);
  const [crop, setCrop] = useState({
    beanName: "",
    country: "",
    process: "",
    variety: "",
    altitude: "",
    notes: "",
  });

  const reset = () => {
    setName(""); setDescription(""); setPrice(""); setCalories(""); setImage("");
    setHasCrop(false);
    setCrop({ beanName: "", country: "", process: "", variety: "", altitude: "", notes: "" });
  };

  const add = () => {
    if (!name.trim()) return;
    const newP: Product = {
      id: `p${Date.now()}`,
      categoryId,
      name,
      description,
      price: Number(price) || 0,
      calories: Number(calories) || 0,
      image: image || undefined,
      cropInfo: hasCrop ? { ...crop } : undefined,
    };
    setList([newP, ...list]);
    reset();
    setOpen(false);
  };

  const filtered = list.filter((p) => {
    const matchCat = filter === "all" || p.categoryId === filter;
    const matchQ = !q || p.name.includes(q);
    return matchCat && matchQ;
  });

  const remove = (id: string) => setList(list.filter((p) => p.id !== id));

  return (
    <DashboardLayout
      title="المنتجات"
      subtitle={`${list.length} منتج في المنيو`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg">
              <Plus className="w-4 h-4" />
              منتج جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">منتج جديد</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>اسم المنتج</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: في60 إثيوبي" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>التصنيف</Label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>رابط الصورة</Label>
                  <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>الوصف</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر للمنتج..." className="rounded-xl min-h-[70px]" />
                </div>
                <div className="space-y-2">
                  <Label>السعر (ر.س)</Label>
                  <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>السعرات</Label>
                  <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="0" className="h-11 rounded-xl" />
                </div>
              </div>

              {/* Crop info toggle */}
              <div className="border border-border rounded-2xl p-4 bg-secondary/40">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={hasCrop}
                    onChange={(e) => setHasCrop(e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  <Sprout className="w-4 h-4 text-accent-foreground" />
                  <span className="font-bold text-sm">إضافة معلومات المحاصيل (للبن المختص)</span>
                </label>

                {hasCrop && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {([
                      ["beanName", "اسم البن", "مثال: يرقاتشيف"],
                      ["country", "البلد", "مثال: إثيوبيا"],
                      ["process", "نوع المعالجة", "مغسولة / طبيعية / عسلية"],
                      ["variety", "السلالة", "مثال: هيرلوم"],
                      ["altitude", "الارتفاع", "مثال: ٢٠٠٠ م"],
                      ["notes", "الإيحاءات", "مثال: ياسمين، ليمون"],
                    ] as const).map(([key, label, ph]) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          value={crop[key]}
                          onChange={(e) => setCrop({ ...crop, [key]: e.target.value })}
                          placeholder={ph}
                          className="h-10 rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="hero" onClick={add}>إضافة المنتج</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="bg-card rounded-2xl border border-border p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن منتج..." className="h-11 rounded-xl pr-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === "all" ? "bg-gradient-gold text-primary shadow-gold" : "bg-secondary text-muted-foreground hover:text-primary"
            }`}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === c.id ? "bg-gradient-gold text-primary shadow-gold" : "bg-secondary text-muted-foreground hover:text-primary"
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => {
          const cat = categories.find((c) => c.id === p.categoryId);
          return (
            <div key={p.id} className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-warm hover:border-accent/40 transition-all">
              <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-card/90 backdrop-blur text-xs font-bold text-primary">
                  {cat?.icon} {cat?.name}
                </div>
                {p.cropInfo && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-accent/95 backdrop-blur text-xs font-bold text-accent-foreground flex items-center gap-1">
                    <Sprout className="w-3 h-3" />
                    محصول
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-display font-bold text-primary leading-tight">{p.name}</h3>
                  <span className="font-display font-black text-accent shrink-0">{p.price} ر.س</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                {p.cropInfo && (
                  <div className="text-[11px] text-muted-foreground mb-2 leading-relaxed border-r-2 border-accent/60 pr-2">
                    <span className="font-bold text-foreground">{p.cropInfo.beanName}</span>
                    {" • "}{p.cropInfo.country}{" • "}{p.cropInfo.process}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{p.calories} سعرة</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default Products;