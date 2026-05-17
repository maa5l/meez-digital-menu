import { z } from "zod";
import { DEVICE_CODE_PATTERN, DEVICE_PIN_PATTERN } from "@/config/app";

export const devicePinSchema = z.object({
  pin: z.string().regex(DEVICE_PIN_PATTERN, "أدخل 4 أرقام صحيحة"),
});

export const deviceActivationCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(DEVICE_CODE_PATTERN, "رمز التفعيل غير صالح (مثال: QM-A1B2)"),
});

export type DevicePinInput = z.infer<typeof devicePinSchema>;
export type DeviceActivationInput = z.infer<typeof deviceActivationCodeSchema>;
