import { Logo } from "@/components/Brand";

/** شاشة انتظار أثناء جلب المنيو — لا تُظهر حالة الفراغ */
const MenuLoadingSplash = ({ message = "جاري تحميل المنيو…" }: { message?: string }) => (
  <div
    className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-6 bg-[#1a1510] px-6 text-center"
    role="status"
    aria-live="polite"
    aria-busy="true"
    dir="rtl"
  >
    <Logo className="h-14 w-auto max-w-[min(52vw,220px)] opacity-95 md:h-16" />
    <div
      className="h-9 w-9 animate-spin rounded-full border-2 border-[#f6f2ea]/25 border-t-[#f6f2ea]"
      aria-hidden
    />
    <p className="text-sm font-semibold tracking-wide text-[#f6f2ea]/75 md:text-base">{message}</p>
  </div>
);

export default MenuLoadingSplash;
