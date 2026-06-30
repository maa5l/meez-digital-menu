import { createContext, useContext, type ReactNode } from "react";
import { useMenuLang as useMenuLangState } from "@/hooks/useMenuLang";
import type { MenuLang } from "@/lib/product-i18n";

type MenuLangContextValue = {
  lang: MenuLang;
  toggleLang: () => void;
  setLang: (lang: MenuLang) => void;
};

const MenuLangContext = createContext<MenuLangContextValue | null>(null);

export function MenuLangProvider({ children }: { children: ReactNode }) {
  const value = useMenuLangState();
  return <MenuLangContext.Provider value={value}>{children}</MenuLangContext.Provider>;
}

/** لغة المنيو — يستخدم السياق إن وُجد، وإلا حالة محلية */
export function useMenuLang() {
  const ctx = useContext(MenuLangContext);
  const local = useMenuLangState();
  return ctx ?? local;
}
