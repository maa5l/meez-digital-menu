import { Languages } from "lucide-react";

type Props = {
  lang: "ar" | "en";
  textColor: string;
  onToggle: () => void;
};

/** زر تبديل اللغة في شريط الهيدر الفرعي لمنيو المحاصيل */
const CropsLangToggle = ({ lang, textColor, onToggle }: Props) => (
  <div className="flex justify-end" dir="ltr">
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
      style={{ color: textColor }}
    >
      <Languages className="w-4 h-4" />
      {lang === "ar" ? "EN" : "AR"}
    </button>
  </div>
);

export default CropsLangToggle;
