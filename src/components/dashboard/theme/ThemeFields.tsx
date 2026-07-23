import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SpecLine = { label: string; value: string };

type Props = {
  label: string;
  description?: string;
  previewUrl?: string;
  aspectClass?: string;
  specs?: SpecLine[];
  accept?: string;
  processing?: boolean;
  error?: string | null;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  emptyHint?: string;
};

export function ImageUploadField({
  label,
  description,
  previewUrl,
  aspectClass = "aspect-[3/1]",
  specs = [],
  accept = "image/*",
  processing = false,
  error,
  onUpload,
  onClear,
  emptyHint = "اسحب صورة أو اضغط للرفع",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const synthetic = {
      target: { files: e.dataTransfer.files, value: "" },
    } as ChangeEvent<HTMLInputElement>;
    onUpload(synthetic);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-bold text-primary">{label}</div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
          dragOver ? "border-accent bg-accent/5" : "border-border bg-secondary/20",
          "cursor-pointer touch-manipulation",
        )}
        aria-label={label}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className={cn("w-full object-cover", aspectClass)} />
        ) : (
          <div className={cn("flex flex-col items-center justify-center gap-2 text-muted-foreground", aspectClass, "min-h-[120px]")}>
            <ImageIcon className="h-8 w-8 opacity-40" />
            <span className="text-xs font-semibold">{emptyHint}</span>
          </div>
        )}
        {processing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="sr-only">جاري المعالجة</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onUpload}
          aria-hidden
        />
      </div>

      {specs.length > 0 && (
        <dl className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
          {specs.map((s) => (
            <div key={s.label} className="text-xs">
              <dt className="font-bold text-muted-foreground">{s.label}</dt>
              <dd className="mt-0.5 font-semibold text-foreground">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {error && <p className="text-xs font-semibold text-destructive" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => inputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" />
          {previewUrl ? "استبدال" : "رفع صورة"}
        </Button>
        {previewUrl && onClear && (
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
            إزالة
          </Button>
        )}
      </div>
    </div>
  );
}

export function ColorPickerField({
  label,
  hint,
  value,
  onChange,
  preview,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  preview?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-secondary/25 p-3 md:p-4">
      <div className="mb-3 text-right">
        <div className="text-sm font-bold text-primary">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</div>}
      </div>
      <div className="flex items-center gap-2.5">
        <label className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background shadow-inner">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-[160%] w-[160%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 bg-transparent p-0 touch-manipulation"
            aria-label={label}
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-xs uppercase text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          spellCheck={false}
          dir="ltr"
        />
        {preview}
      </div>
    </div>
  );
}

export function TemplateOptionCard({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-right transition-all touch-manipulation sm:gap-4 sm:p-5",
        "hover:border-accent/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-accent bg-accent/10 shadow-gold" : "border-border bg-card",
      )}
      aria-pressed={active}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
          active ? "bg-accent/20 text-accent-foreground" : "bg-secondary text-muted-foreground group-hover:text-primary",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="font-display text-base font-bold leading-snug text-primary">{title}</div>
        <div className="text-xs leading-relaxed text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

export function ToggleChip({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-full border px-4 py-2.5 text-xs font-bold transition-colors touch-manipulation",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground hover:border-accent/40",
      )}
      aria-pressed={checked}
    >
      {label}
    </button>
  );
}

export function AdvancedCollapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border/80 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-primary touch-manipulation"
        aria-expanded={open}
      >
        {title}
        <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="space-y-4 border-t border-border/60 px-4 py-4">{children}</div>}
    </div>
  );
}
