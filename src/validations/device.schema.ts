import { z } from "zod";
import { DEVICE_CODE_PATTERN, DEVICE_PIN_PATTERN, normalizeDeviceActivationCode } from "@/config/app";

export const devicePinSchema = z.object({
  pin: z.string().regex(DEVICE_PIN_PATTERN, "أدخل 4 أرقام صحيحة"),
});

export const deviceActivationCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => normalizeDeviceActivationCode(value))
    .refine((value) => DEVICE_CODE_PATTERN.test(value), {
      message: "أدخل 4 أحرف/أرقام من الرمز الظاهر على الجهاز",
    }),
});

export type DevicePinInput = z.infer<typeof devicePinSchema>;
export type DeviceActivationInput = z.infer<typeof deviceActivationCodeSchema>;
