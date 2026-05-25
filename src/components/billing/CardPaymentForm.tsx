import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cardPaymentSchema, type CardPaymentInput } from "@/validations/payment.schema";

type Props = {
  amountLabel: string;
  loading?: boolean;
  onSubmit: (data: CardPaymentInput) => void | Promise<void>;
};

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function CardPaymentForm({ amountLabel, loading, onSubmit }: Props) {
  const [showCvc, setShowCvc] = useState(false);
  const form = useForm<CardPaymentInput>({
    resolver: zodResolver(cardPaymentSchema),
    defaultValues: {
      cardholderName: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvc: "",
    },
  });

  const cardNumber = form.watch("cardNumber");

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit((data) => void onSubmit(data))}
      autoComplete="off"
    >
      <div className="rounded-xl border border-border bg-secondary/30 p-4 flex items-center gap-3">
        <Lock className="w-5 h-5 text-accent shrink-0" aria-hidden />
        <p className="text-xs text-muted-foreground leading-relaxed">
          بيانات البطاقة تُعالج عبر بوابة دفع آمنة. في بيئة التطوير يتم محاكاة الدفع فقط —
          لا تُخزَّن أرقام البطاقة الكاملة على خوادمنا.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardholderName">اسم حامل البطاقة</Label>
        <Input
          id="cardholderName"
          placeholder="كما يظهر على البطاقة"
          className="h-12 rounded-xl"
          {...form.register("cardholderName")}
        />
        {form.formState.errors.cardholderName && (
          <p className="text-xs text-destructive">{form.formState.errors.cardholderName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardNumber">رقم البطاقة</Label>
        <div className="relative">
          <CreditCard
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="cardNumber"
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            dir="ltr"
            className="h-12 rounded-xl pr-11 font-mono tracking-wider"
            value={formatCardNumber(cardNumber)}
            onChange={(e) =>
              form.setValue("cardNumber", e.target.value.replace(/\D/g, "").slice(0, 16), {
                shouldValidate: true,
              })
            }
          />
        </div>
        {form.formState.errors.cardNumber && (
          <p className="text-xs text-destructive">{form.formState.errors.cardNumber.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="expiryMonth">الشهر</Label>
          <Input
            id="expiryMonth"
            inputMode="numeric"
            placeholder="MM"
            maxLength={2}
            dir="ltr"
            className="h-12 rounded-xl text-center font-mono"
            {...form.register("expiryMonth")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiryYear">السنة</Label>
          <Input
            id="expiryYear"
            inputMode="numeric"
            placeholder="YY"
            maxLength={2}
            dir="ltr"
            className="h-12 rounded-xl text-center font-mono"
            {...form.register("expiryYear")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvc">CVV</Label>
          <Input
            id="cvc"
            type={showCvc ? "text" : "password"}
            inputMode="numeric"
            placeholder="•••"
            maxLength={4}
            dir="ltr"
            className="h-12 rounded-xl text-center font-mono"
            onFocus={() => setShowCvc(true)}
            onBlur={() => setShowCvc(false)}
            {...form.register("cvc")}
          />
        </div>
      </div>

      {(form.formState.errors.expiryMonth ||
        form.formState.errors.expiryYear ||
        form.formState.errors.cvc) && (
        <p className="text-xs text-destructive">
          {form.formState.errors.expiryMonth?.message ??
            form.formState.errors.expiryYear?.message ??
            form.formState.errors.cvc?.message}
        </p>
      )}

      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري الدفع…
          </>
        ) : (
          <>ادفع {amountLabel}</>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        <span className="inline-block px-2 py-0.5 rounded bg-secondary font-bold">Mada</span>
        <span className="inline-block px-2 py-0.5 rounded bg-secondary font-bold">Visa</span>
        <span className="inline-block px-2 py-0.5 rounded bg-secondary font-bold">Mastercard</span>
      </p>
    </form>
  );
}
