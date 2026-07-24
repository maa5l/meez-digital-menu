import { z } from "zod";

export const loginEmailSchema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(254),
});

export const loginSchema = loginEmailSchema.extend({
  password: z
    .string()
    .min(8, "كلمة المرور 8 أحرف على الأقل")
    .max(128, "كلمة المرور طويلة جداً"),
});

export const loginOtpSchema = loginEmailSchema.extend({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "أدخل رمز التحقق المكوّن من 6 أرقام"),
});

export const resetPasswordSchema = loginOtpSchema.extend({
  password: z
    .string()
    .min(8, "كلمة المرور 8 أحرف على الأقل")
    .max(128, "كلمة المرور طويلة جداً"),
});

export const signupSchema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(254),
  password: z
    .string()
    .min(8, "كلمة المرور 8 أحرف على الأقل")
    .max(128, "كلمة المرور طويلة جداً"),
  phone: z
    .string()
    .trim()
    .min(1, "رقم الجوال مطلوب")
    .max(20, "رقم الجوال طويل جداً")
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      // سعودي: 05xxxxxxxx أو +9665xxxxxxxx — مع قبول أرقام دولية معقولة
      if (/^(?:\+?966|0)?5\d{8}$/.test(value.replace(/[\s-]/g, ""))) return true;
      return digits.length >= 9 && digits.length <= 15;
    }, "أدخل رقم جوال صالح"),
  venueName: z.string().trim().min(2, "اسم المنشأة مطلوب").max(120),
});

export type LoginEmailInput = z.infer<typeof loginEmailSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginOtpInput = z.infer<typeof loginOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
