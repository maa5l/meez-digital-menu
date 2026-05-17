import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useVenueData } from "@/hooks/useVenueData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Categories = () => {
  const [venue, updateVenue] = useVenueData();
  const list = venue.categories;
  const products = venue.products;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");

  const add = () => {
    if (!name.trim()) return;
    updateVenue((v) => ({
      ...v,
      categories: [...v.categories, { id: `c${Date.now()}`, name, icon }],
    }));
    setName("");
    setIcon("✨");
    setOpen(false);
  };

  const remove = (id: string) =>
    updateVenue((v) => ({
      ...v,
      categories: v.categories.filter((c) => c.id !== id),
    }));

  return (
    <DashboardLayout
      title="التصنيفات"
      subtitle="نظّم منتجاتك في مجلدات يسهل تصفحها"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg">
              <Plus className="w-4 h-4" />
              تصنيف جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">تصنيف جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>الأيقونة (إيموجي)</Label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="h-12 rounded-xl text-2xl text-center" maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label>اسم التصنيف</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: المعجنات" className="h-12 rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="hero" onClick={add}>إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {list.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="font-display font-bold text-xl text-primary mb-2">لا توجد تصنيفات بعد</p>
          <p className="text-sm text-muted-foreground">أنشئ أول تصنيف لبدء بناء منيوك.</p>
        </div>
      ) : (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return (
            <div key={c.id} className="group bg-card border border-border rounded-2xl p-6 hover:shadow-warm hover:border-accent/40 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-cream flex items-center justify-center text-3xl">
                  {c.icon}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => remove(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <h3 className="font-display font-bold text-xl text-primary mb-1">{c.name}</h3>
              <p className="text-sm text-muted-foreground">{count} منتج</p>
            </div>
          );
        })}
      </div>
      )}
    </DashboardLayout>
  );
};

export default Categories;