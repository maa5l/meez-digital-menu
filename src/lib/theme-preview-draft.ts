import { defaultMenuSettings, type MenuSettings } from "@/lib/mockData";

export const THEME_PREVIEW_DRAFT_KEY = "meez:theme-preview-draft";
export const THEME_PREVIEW_DRAFT_EVENT = "meez:theme-preview-draft";

export function setThemePreviewDraft(settings: MenuSettings): void {
  try {
    localStorage.setItem(THEME_PREVIEW_DRAFT_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event(THEME_PREVIEW_DRAFT_EVENT));
  } catch {
    /* quota / private mode */
  }
}

export function getThemePreviewDraft(): MenuSettings | null {
  try {
    const raw = localStorage.getItem(THEME_PREVIEW_DRAFT_KEY);
    if (!raw) return null;
    return { ...defaultMenuSettings, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export function clearThemePreviewDraft(): void {
  try {
    localStorage.removeItem(THEME_PREVIEW_DRAFT_KEY);
    window.dispatchEvent(new Event(THEME_PREVIEW_DRAFT_EVENT));
  } catch {
    /* ignore */
  }
}

export function mergeVenueWithPreviewDraft<T extends { menuSettings?: MenuSettings }>(venue: T): T {
  const draft = getThemePreviewDraft();
  if (!draft) return venue;
  return {
    ...venue,
    menuSettings: { ...defaultMenuSettings, ...venue.menuSettings, ...draft },
  };
}
