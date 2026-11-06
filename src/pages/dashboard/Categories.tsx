import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useVenueData } from "@/hooks/useVenueData";
import type { Category } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { nextSortOrder, sortCatalogManual } from "@/lib/catalog-order";

const emptyForm = () => ({
  name: "",
  nameEn: "",
  sortOrder: "",
});

const Categories = () => {
  const [venue, updateVenue] = useVenueData();
  const list = sortCatalogManual(venue.categories);
  const products = venue.products;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      sortOrder: String(nextSortOrder(venue.categories)),
    });
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      nameEn: c.nameEn || "",
      sortOrder: c.sortOrder != null ? String(c.sortOrder) : "",
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    const parsedOrder = Number(form.sortOrder);
    const sortOrder =
      form.sortOrder.trim() !== "" && Number.isFinite(parsedOrder) ? parsedOrder : undefined;

    if (editingId) {
      updateVenue((v) => ({
        ...v,
        categories: v.categories.map((c) =>
          c.id === editingId
            ? {
                ...c,
                name: form.name.trim(),
                nameEn: form.nameEn.trim() || undefined,
                sortOrder,
              }
            : c,
        ),
      }));
    } else {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `c${Date.now()}`;
      updateVenue((v) => ({
        ...v,
        categories: [
          ...v.categories,
          {
            id,
            name: form.name.trim(),
            nameEn: form.nameEn.trim() || undefined,
            sortOrder: sortOrder ?? nextSortOrder(v.categories),
          },
        ],
      }));
    }

    setForm(emptyForm());
    setEditingId(null);
    setOpen(false);
  };

  const remove = (id: string) =>
    updateVenue((v) => ({
      ...v,
      categories: v.categories.filter((c) => c.id !== id),
    }));

  return (
    <SubscriptionGuard requireEdit>
      <DashboardLayout
        title="التصنيفات"
        subtitle="نظّم منتجاتك في مجلدات يسهل تصفحها — رقم الترتيب 1 يظهر أولاً"
        action={
          <Button variant="hero" size="lg" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            تصنيف جديد
          </Button>
        }
      >
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditingId(null);
              setForm(emptyForm());
            }
          }}
        >
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {editingId ? "تعديل تصنيف" : "تصنيف جديد"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>اسم التصنيف (عربي)</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: المعجنات"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Category name (English)</Label>
                <Input
                  dir="ltr"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  placeholder="e.g. Bakery"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الترتيب</Label>
                <Input
                  type="number"
                  min={1}
                  dir="ltr"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  placeholder="1 = أولاً"
                  className="h-12 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  الأصغر يظهر أولاً — بالعربي من اليمين، وبالإنجليزي من اليسار (1 ثم 2 ثم 3)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="hero" onClick={save}>
                {editingId ? "حفظ" : "إضافة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <div
                  key={c.id}
                  className="group bg-card border border-border rounded-2xl p-6 hover:shadow-warm hover:border-accent/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-cream text-primary">
                      <FolderTree className="h-7 w-7" aria-hidden />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    {c.sortOrder != null && (
                      <span className="rounded-lg bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                        #{c.sortOrder}
                      </span>
                    )}
                    <h3 className="font-display font-bold text-xl text-primary">{c.name}</h3>
                  </div>
                  {c.nameEn && (
                    <p className="mb-1 text-sm text-muted-foreground" dir="ltr">
                      {c.nameEn}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{count} منتج</p>
                </div>
              );
            })}
          </div>
        )}
      </DashboardLayout>
    </SubscriptionGuard>
  );
};

export default Categories;
