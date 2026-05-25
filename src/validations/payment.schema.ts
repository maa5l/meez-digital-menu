import { z } from "zod";

export const cardPaymentSchema = z.object({
  cardholderName: z
    .string()
    .trim()
    .min(2, "اسم حامل البطاقة مطلوب")
    .max(80),
  cardNumber: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => /^\d{16}$/.test(v), "رقم البطاقة يجب أن يكون 16 رقماً"),
  expiryMonth: z
    .string()
    .regex(/^(0[1-9]|1[0-2])$/, "الشهر غير صالح"),
  expiryYear: z
    .string()
    .regex(/^\d{2}$/, "السنة غير صالحة"),
  cvc: z.string().regex(/^\d{3,4}$/, "رمز الأمان غير صالح"),
});

export type CardPaymentInput = z.infer<typeof cardPaymentSchema>;
