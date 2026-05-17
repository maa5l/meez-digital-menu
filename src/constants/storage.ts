/** مفاتيح التخزين المحلي — لا تخزّن tokens أو أسرار هنا */
export const STORAGE_KEYS = {
  MENU_SETTINGS: "meez:menu-settings",
  /** @deprecated — يُهاجر تلقائياً */
  LEGACY_MENU_SETTINGS: "qaemah-menu-settings",
  LEGACY_TEMPLATE: "qaemah-template",
  DEVICE_PENDING_CODE: "meez:device-pending-code",
  DEVICE_ACTIVATED_PREFIX: "meez:device-activated:",
  LAST_VENUE_OWNER: "meez:last-venue-owner",
  DEVICE_OWNER_PREFIX: "meez:device-owner:",
  DEVICE_VENUE_PREFIX: "meez:device-venue:",
  DEVICE_MENU_TYPE_PREFIX: "meez:device-menu-type:",
} as const;

export const SESSION_KEYS = {
  AUTH: "meez:auth-session",
} as const;
