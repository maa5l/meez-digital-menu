import { Check } from "lucide-react";
import { ALLERGEN_OPTIONS } from "@/constants/allergens";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
};

const AllergenSelector = ({ value, onChange }: Props) => {
  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ALLERGEN_OPTIONS.map(({ id, labelAr, labelEn, Icon }) => {
        const selected = value.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all",
              "hover:border-accent/50 hover:bg-secondary/60",
              selected
                ? "border-accent bg-accent/15 shadow-gold"
                : "border-border bg-card",
            )}
            aria-pressed={selected}
          >
            {selected && (
              <span className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                selected ? "bg-accent/25 text-accent-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="font-bold text-xs text-primary leading-tight">{labelAr}</span>
            <span className="text-[10px] text-muted-foreground leading-tight" dir="ltr">
              {labelEn}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default AllergenSelector;
