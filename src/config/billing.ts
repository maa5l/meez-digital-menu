/** تسعير الاشتراك — شاشة واحدة = ترخيص واحد */
export const BILLING = {
  pricePerScreenMonthly: 45,
  pricePerScreenYearly: 450,
  currency: "SAR" as const,
  trialDays: 14,
  /** الفترة التجريبية: شاشة واحدة فقط */
  trialMaxScreens: 1,
  minPaidScreens: 1,
  maxPaidScreens: 50,
} as const;

export type BillingCycle = "monthly" | "yearly";

export function priceForScreens(screens: number, cycle: BillingCycle): number {
  const n = Math.max(BILLING.minPaidScreens, screens);
  return cycle === "yearly"
    ? n * BILLING.pricePerScreenYearly
    : n * BILLING.pricePerScreenMonthly;
}

export function cycleLabel(cycle: BillingCycle): string {
  return cycle === "yearly" ? "سنوي" : "شهري";
}
