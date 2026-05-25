import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { CheckoutSession } from "@/services/billing/checkout.service";
import { loadMoyasarScript } from "@/lib/moyasar-loader";

type Props = {
  session: Extract<CheckoutSession, { mode: "moyasar" }>;
};

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

export function MoyasarCheckoutForm({ session }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadMoyasarScript();
        if (cancelled || !containerRef.current || !window.Moyasar) {
          setError("تعذّر تحميل بوابة الدفع");
          setLoading(false);
          return;
        }

        containerRef.current.innerHTML = "";
        const el = document.createElement("div");
        el.className = "mysr-form";
        containerRef.current.appendChild(el);

        window.Moyasar.init({
          element: el,
          amount: session.amount_halalas,
          currency: "SAR",
          description: session.description,
          publishable_api_key: session.publishable_key,
          callback_url: session.callback_url,
          methods: ["creditcard", "mada"],
          metadata: session.metadata,
        });

        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("فشل تحميل نموذج الدفع");
          setLoading(false);
        }
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="relative min-h-[280px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10 rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
        </div>
      )}
      <div ref={containerRef} className="rounded-xl border border-border p-4 bg-card" dir="ltr" />
    </div>
  );
}
