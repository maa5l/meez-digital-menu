import { useState } from "react";
import { LayoutGrid, Columns2, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import TemplateGrid from "@/components/menu/TemplateGrid";
import TemplateSplit from "@/components/menu/TemplateSplit";

export type TemplateKey = "grid" | "split";

const MenuDisplay = () => {
  const [tpl, setTpl] = useState<TemplateKey>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("qaemah-template") : null;
    return (saved as TemplateKey) || "grid";
  });

  const choose = (k: TemplateKey) => {
    setTpl(k);
    localStorage.setItem("qaemah-template", k);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#fafafa] flex flex-col" dir="rtl">
      {/* Floating template switcher (top-left in RTL) */}
      <div className="absolute top-3 left-3 z-40 flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-md border border-black/5 p-1">
        <button
          onClick={() => choose("grid")}
          title="قالب البطاقات"
          className={`px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${
            tpl === "grid" ? "bg-[#1a1a1a] text-white" : "text-[#5a5a5a] hover:bg-[#ededed]"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">القالب ١</span>
        </button>
        <button
          onClick={() => choose("split")}
          title="قالب التفاصيل"
          className={`px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${
            tpl === "split" ? "bg-[#1a1a1a] text-white" : "text-[#5a5a5a] hover:bg-[#ededed]"
          }`}
        >
          <Columns2 className="w-4 h-4" />
          <span className="hidden sm:inline">القالب ٢</span>
        </button>
        <Link
          to="/dashboard"
          className="px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-[#5a5a5a] hover:bg-[#ededed]"
          title="لوحة التحكم"
        >
          <SettingsIcon className="w-4 h-4" />
        </Link>
      </div>

      {tpl === "grid" ? <TemplateGrid /> : <TemplateSplit />}
    </div>
  );
};

export default MenuDisplay;