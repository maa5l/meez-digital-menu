import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { categories, products as initial } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, ImageIcon } from "lucide-react";

const Products = () => {
  const [list, setList] = useState(initial);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

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
        <Button variant="hero" size="lg">
          <Plus className="w-4 h-4" />
          منتج جديد
        </Button>
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
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-display font-bold text-primary leading-tight">{p.name}</h3>
                  <span className="font-display font-black text-accent shrink-0">{p.price} ر.س</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
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