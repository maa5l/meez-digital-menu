/** معلومات التواصل — يظهر عند انتهاء الاشتراك */
const env = import.meta.env;

export const SUPPORT = {
  email: (env.VITE_SUPPORT_EMAIL as string | undefined) ?? "support@meez.app",
  get emailHref() {
    return `mailto:${this.email}`;
  },
  whatsapp: (env.VITE_SUPPORT_WHATSAPP as string | undefined) ?? "966500000000",
  get whatsappHref() {
    return `https://wa.me/${this.whatsapp.replace(/\D/g, "")}`;
  },
  whatsappLabel: "تواصل عبر واتساب",
  contactLabel: "تواصل معنا",
} as const;

/** مدة التجربة المجانية (أيام) — يجب أن تطابق Postgres */
export const TRIAL_DAYS = 7;
