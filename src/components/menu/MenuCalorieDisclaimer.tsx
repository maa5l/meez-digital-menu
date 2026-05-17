type Props = {
  lang: "ar" | "en";
  textColor: string;
  className?: string;
};

const ICONS = {
  men: "/menu-icons/men.jpg",
  women: "/menu-icons/women.jpg",
  children: "/menu-icons/children.jpg",
} as const;

type Row = { icon: (typeof ICONS)[keyof typeof ICONS]; label: string; text: string };

const copy: Record<"ar" | "en", { title: string; rows: Row[] }> = {
  ar: {
    title: "إفصاح إلزامي — متوسط حرق السعرات",
    rows: [
      {
        icon: ICONS.men,
        label: "الرجال",
        text: "متوسط حرق السعرات خلال 60 دقيقة: 300 – 600 سعرة حرارية",
      },
      {
        icon: ICONS.women,
        label: "النساء",
        text: "متوسط حرق السعرات خلال 60 دقيقة: 250 – 500 سعرة حرارية",
      },
      {
        icon: ICONS.children,
        label: "الأطفال",
        text: "متوسط حرق السعرات خلال 60 دقيقة: 150 – 350 سعرة حرارية",
      },
    ],
  },
  en: {
    title: "Mandatory disclosure — average calorie burn",
    rows: [
      { icon: ICONS.men, label: "Men", text: "Average burn in 60 minutes: 300 – 600 calories" },
      { icon: ICONS.women, label: "Women", text: "Average burn in 60 minutes: 250 – 500 calories" },
      { icon: ICONS.children, label: "Children", text: "Average burn in 60 minutes: 150 – 350 calories" },
    ],
  },
};

/** شريط قانوني إلزامي — أعلى الهيدر، عرض أفقي */
const MenuCalorieDisclaimer = ({ lang, textColor, className = "" }: Props) => {
  const L = copy[lang];

  return (
    <div
      className={`shrink-0 w-full border-b border-black/10 bg-black/[0.04] px-3 md:px-6 py-1.5 md:py-2 ${className}`}
      style={{ color: textColor }}
      role="note"
      aria-label={L.title}
    >
      <ul className="grid grid-cols-3 gap-2 md:gap-4 items-start">
        {L.rows.map(({ icon, label, text }) => (
          <li key={label} className="flex gap-1 md:gap-1.5 min-w-0 items-start">
            <img
              src={icon}
              alt=""
              className="h-3.5 md:h-4 w-auto shrink-0 object-contain object-top mt-px"
              aria-hidden
            />
            <div className="min-w-0 text-[7px] md:text-[8px] leading-snug">
              <span className="font-bold block truncate">{label}</span>
              <span className="opacity-85 font-medium">{text}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MenuCalorieDisclaimer;
