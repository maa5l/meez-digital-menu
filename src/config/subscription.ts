import { TRIAL_DAYS } from "@/config/support";

/** إعدادات الاشتراك — بدون بوابات دفع */
export const SUBSCRIPTION = {
  trialDays: TRIAL_DAYS,
  trialMaxScreens: 1,
  defaultActiveDays: 30,
  minDeviceLimit: 1,
  maxDeviceLimit: 50,
} as const;
