/** إعادة تعيين عرض المنيو في الكiosk: تمرير للأعلى + تحديث البيانات */
export const MENU_KIOSK_RESET_MS = 20_000;
export const MENU_KIOSK_RESET_EVENT = "meez:menu-kiosk-reset";
export const MENU_KIOSK_GATE_REFRESH_EVENT = "meez:kiosk-gate-refresh";

export function dispatchMenuKioskReset() {
  window.dispatchEvent(new CustomEvent(MENU_KIOSK_RESET_EVENT));
}

export function dispatchKioskGateRefresh(detail?: { code?: string; reason?: string }) {
  window.dispatchEvent(new CustomEvent(MENU_KIOSK_GATE_REFRESH_EVENT, { detail }));
}
