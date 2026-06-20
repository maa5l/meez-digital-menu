/** إعادة تعيين عرض المنيو في الكiosk: تمرير للأعلى + تحديث البيانات */
export const MENU_KIOSK_RESET_MS = 20_000;
export const MENU_KIOSK_RESET_EVENT = "meez:menu-kiosk-reset";

export function dispatchMenuKioskReset() {
  window.dispatchEvent(new CustomEvent(MENU_KIOSK_RESET_EVENT));
}
