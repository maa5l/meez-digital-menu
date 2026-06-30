import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function ThemeSectionPanel({ title, description, children, className }: Props) {
  return (
    <section className={cn("space-y-6", className)}>
      <header className="space-y-1 border-b border-border/60 pb-4">
        <h2 className="font-display text-xl font-black text-primary md:text-2xl">{title}</h2>
        {description && <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function ThemeCard({
  children,
  className,
  padding = "default",
}: {
  children: ReactNode;
  className?: string;
  padding?: "default" | "compact";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card shadow-sm",
        padding === "default" ? "p-5 md:p-6" : "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ThemeFieldGroup({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-bold text-primary">
        {label}
      </label>
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
