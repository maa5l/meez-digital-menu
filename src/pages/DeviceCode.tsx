import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Brand";
import { Button } from "@/components/ui/button";

const DeviceCode = () => {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  const setAt = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError("");
    if (v && i < 3) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const submit = () => {
    const code = digits.join("");
    if (code.length !== 4) {
      setError("أدخل الرمز كاملاً (4 أرقام)");
      return;
    }
    // Mock: any 4-digit code opens the menu
    navigate("/menu");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      <div className="absolute -top-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-accent/15 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 text-primary-foreground">
          <Logo className="h-20 w-auto aspect-[1031/736] mb-4 animate-float" />
          <p className="text-primary-foreground/60">أدخل رمز الجهاز لفتح المنيو</p>
        </div>

        {/* Code input card */}
        <div className="bg-card/95 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 shadow-warm border border-accent/20">
          <div className="text-center mb-6">
            <div className="text-xs uppercase tracking-widest text-accent font-bold mb-2">رمز التفعيل</div>
            <div className="text-muted-foreground text-sm">احصل عليه من لوحة التحكم</div>
          </div>

          <div className="flex justify-center gap-3 mb-6" dir="ltr">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                inputMode="numeric"
                maxLength={1}
                className="w-16 h-20 md:w-20 md:h-24 text-center font-display font-black text-4xl md:text-5xl text-primary bg-secondary border-2 border-border rounded-2xl focus:border-accent focus:outline-none focus:shadow-gold transition-all"
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-destructive text-sm font-semibold mb-4">{error}</p>
          )}

          <Button variant="hero" size="xl" className="w-full" onClick={submit}>
            فتح المنيو
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              للتجربة: أدخل أي 4 أرقام (مثل 1234)
            </p>
          </div>
        </div>

        <p className="text-center text-primary-foreground/50 text-xs mt-8">
          مشكلة في الاتصال؟ تأكد من اتصال الجهاز بالإنترنت.
        </p>
      </div>
    </div>
  );
};

export default DeviceCode;