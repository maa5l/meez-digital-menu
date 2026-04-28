import { useEffect, useState } from "react";
import { loadMenuSettings, saveMenuSettings, type MenuSettings } from "@/lib/mockData";

/**
 * Reactive menu settings — يستمع لتغييرات localStorage حتى لو
 * كانت الإعدادات تُعدَّل من تبويب آخر (شاشة الإعدادات على الجوال
 * بينما الـ iPad يعرض المنيو).
 */
export const useMenuSettings = (): [MenuSettings, (s: MenuSettings) => void] => {
  const [settings, setSettings] = useState<MenuSettings>(() => loadMenuSettings());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "qaemah-menu-settings") setSettings(loadMenuSettings());
    };
    const onCustom = () => setSettings(loadMenuSettings());
    window.addEventListener("storage", onStorage);
    window.addEventListener("qaemah-settings-updated", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("qaemah-settings-updated", onCustom);
    };
  }, []);

  const update = (s: MenuSettings) => {
    saveMenuSettings(s);
    setSettings(s);
    window.dispatchEvent(new Event("qaemah-settings-updated"));
  };

  return [settings, update];
};