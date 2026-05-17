import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(254),
  password: z
    .string()
    .min(8, "كلمة المرور 8 أحرف على الأقل")
    .max(128, "كلمة المرور طويلة جداً"),
});

export const signupSchema = loginSchema.extend({
  venueName: z.string().trim().min(2, "اسم المنشأة مطلوب").max(120),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
