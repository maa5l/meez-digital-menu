import { cn } from "@/lib/utils";
import {
  THEME_SECTION_GROUPS,
  THEME_SECTIONS,
  type ThemeSectionId,
} from "@/pages/dashboard/theme/theme-sections";

type Props = {
  active: ThemeSectionId;
  onSelect: (id: ThemeSectionId) => void;
  className?: string;
};

export function ThemeEditorNav({ active, onSelect, className }: Props) {
  return (
    <nav
      className={cn(
        "flex shrink-0 flex-col gap-4 overflow-y-auto overscroll-y-contain",
        "rounded-2xl border border-border/80 bg-card p-3 shadow-sm",
        "md:max-h-[calc(100dvh-12rem)] md:w-56 lg:w-60",
        className,
      )}
      aria-label="أقسام تخصيص المنيو"
    >
      {THEME_SECTION_GROUPS.map((group) => {
        const items = THEME_SECTIONS.filter((s) => s.group === group.key);
        if (items.length === 0) return null;
        return (
          <div key={group.key} className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <group.icon className="h-3.5 w-3.5" />
              {group.label}
            </div>
            {items.map((section) => {
              const isActive = active === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSelect(section.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-sm font-semibold transition-all touch-manipulation",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-gradient-gold text-primary shadow-gold"
                      : "text-muted-foreground hover:bg-secondary hover:text-primary",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <section.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{section.label}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

/** شريط تنقّل أفقي للآيباد */
export function ThemeEditorNavMobile({ active, onSelect, className }: Props) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label="أقسام تخصيص المنيو"
    >
      {THEME_SECTIONS.map((section) => {
        const isActive = active === section.id;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(section.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-xs font-bold touch-manipulation",
              isActive
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}
