import { useState } from "react";
import { categories, products, type Product } from "@/lib/mockData";
import { LayoutGrid, Columns2, X, Flame, UtensilsCrossed, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";

const MenuDisplay = () => {
  const [view, setView] = useState<"split" | "grid">("split");
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const [selected, setSelected] = useState<Product | null>(
    products.find((p) => p.categoryId === categories[0].id) || null
  );
  const [modal, setModal] = useState<Product | null>(null);

  const visible = products.filter((p) => p.categoryId === activeCat);

  return (
    <div className="h-screen overflow-hidden bg-gradient-cream flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-black text-xl text-primary leading-none">مقهى الواحة</div>
            <div className="text-xs text-muted-foreground mt-0.5">منيو اليوم</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-secondary p-1 rounded-xl flex">
            <button
              onClick={() => setView("split")}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${
                view === "split" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"
              }`}
            >
              <Columns2 className="w-4 h-4" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${
                view === "grid" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
          <Link to="/dashboard" className="p-2 rounded-xl hover:bg-secondary text-muted-foreground" title="لوحة التحكم">
            <SettingsIcon className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Categories */}
      <div className="bg-card/60 px-6 py-3 border-b border-border shrink-0 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {categories.map((c) => {
            const active = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCat(c.id);
                  const first = products.find((p) => p.categoryId === c.id);
                  if (first) setSelected(first);
                }}
                className={`px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  active
                    ? "bg-gradient-gold text-primary shadow-gold scale-105"
                    : "bg-secondary text-muted-foreground hover:text-primary"
                }`}
              >
                <span className="text-xl">{c.icon}</span>
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      {view === "split" ? (
        <SplitView products={visible} selected={selected} onSelect={setSelected} />
      ) : (
        <GridView products={visible} onOpen={setModal} />
      )}

      {/* Detail modal for grid view */}
      {modal && <ProductModal product={modal} onClose={() => setModal(null)} />}
    </div>
  );
};

/* ---------------- Split View ---------------- */
const SplitView = ({ products, selected, onSelect }: { products: Product[]; selected: Product | null; onSelect: (p: Product) => void }) => {
  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(280px,360px)_1fr] gap-4 p-4 md:p-6 overflow-hidden">
      {/* List */}
      <div className="bg-card rounded-3xl border border-border overflow-y-auto">
        {products.map((p) => {
          const active = selected?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={`w-full text-right p-4 border-b border-border last:border-b-0 transition-all flex items-center gap-3 ${
                active ? "bg-gradient-cream" : "hover:bg-secondary/40"
              }`}
            >
              {p.image && (
                <img src={p.image} alt={p.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-primary truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.calories} سعرة</div>
              </div>
              <div className={`font-display font-black ${active ? "text-accent" : "text-primary"}`}>
                {p.price} <span className="text-xs">ر.س</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail */}
      {selected && (
        <div className="bg-card rounded-3xl border border-border overflow-y-auto">
          {selected.image && (
            <div className="aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-t-3xl">
              <img src={selected.image} alt={selected.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6 md:p-10">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <h2 className="font-display font-black text-3xl md:text-4xl text-primary leading-tight">{selected.name}</h2>
              <div className="text-left">
                <div className="font-display font-black text-4xl md:text-5xl text-gradient-gold">
                  {selected.price}
                </div>
                <div className="text-sm text-muted-foreground">ريال سعودي</div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-sm font-bold mb-6">
              <Flame className="w-4 h-4" />
              {selected.calories} سعرة حرارية
            </div>

            <p className="text-lg text-foreground/80 leading-relaxed">{selected.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- Grid View ---------------- */
const GridView = ({ products, onOpen }: { products: Product[]; onOpen: (p: Product) => void }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p)}
            className="group bg-card rounded-3xl border border-border overflow-hidden text-right hover:shadow-warm hover:border-accent/40 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="aspect-square overflow-hidden bg-secondary">
              {p.image && (
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              )}
            </div>
            <div className="p-4">
              <h3 className="font-display font-bold text-primary mb-1 line-clamp-1">{p.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{p.calories} سعرة</span>
                <span className="font-display font-black text-accent">
                  {p.price} <span className="text-xs">ر.س</span>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- Modal ---------------- */
const ProductModal = ({ product, onClose }: { product: Product; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 bg-primary/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in-up" onClick={onClose}>
      <div
        className="bg-card w-full max-w-2xl rounded-t-[2rem] md:rounded-[2rem] overflow-hidden shadow-warm max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {product.image && (
          <div className="aspect-[21/9] overflow-hidden relative">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            <button onClick={onClose} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center text-primary hover:scale-110 transition-transform">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6 md:p-10">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <h2 className="font-display font-black text-3xl md:text-4xl text-primary leading-tight">{product.name}</h2>
            <div className="text-left">
              <div className="font-display font-black text-4xl md:text-5xl text-gradient-gold">{product.price}</div>
              <div className="text-sm text-muted-foreground">ريال سعودي</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-sm font-bold mb-5">
            <Flame className="w-4 h-4" />
            {product.calories} سعرة
          </div>
          <p className="text-lg text-foreground/80 leading-relaxed">{product.description}</p>
        </div>
      </div>
    </div>
  );
};

export default MenuDisplay;