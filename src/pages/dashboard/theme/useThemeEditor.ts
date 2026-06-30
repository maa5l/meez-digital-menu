import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { defaultMenuSettings, type MenuSettings } from "@/lib/mockData";

import type { MenuHeaderCustomization, MenuPalette } from "@/types/domain";

import { getCropsPalette, getProductsPalette } from "@/lib/menu-palette";

import {

  patchCropsHeader,

  patchProductsHeader,

} from "@/lib/menu-header-settings";

import { useVenueData } from "@/hooks/useVenueData";

import { toast } from "sonner";

import { processHeaderImageFile } from "@/lib/header-image";

import { setThemePreviewDraft, clearThemePreviewDraft } from "@/lib/theme-preview-draft";

import { debounce } from "@/lib/throttle";

import { getCurrentUserId } from "@/lib/venue-store";

import { usesSupabaseAuth } from "@/config/env";

import { getErrorMessage } from "@/lib/errors";



export function useThemeEditor() {

  const [venue, updateVenue, { loading: venueLoading }] = useVenueData();

  const [settings, setSettings] = useState<MenuSettings>(() => ({

    ...defaultMenuSettings,

    ...venue.menuSettings,

  }));

  const [saving, setSaving] = useState(false);

  const hydratedRef = useRef(false);

  const { products, crops } = venue;



  const pushPreviewDraft = useMemo(

    () => debounce((next: MenuSettings) => setThemePreviewDraft(next), 900),

    [],

  );



  // تحميل أولي من السحابة — مرة واحدة فقط، بدون إعادة ضبط أثناء التعديل
  useEffect(() => {
    if (hydratedRef.current || venueLoading) return;
    const next = { ...defaultMenuSettings, ...venue.menuSettings };
    setSettings(next);
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when loading completes
  }, [venueLoading]);

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify({ ...defaultMenuSettings, ...venue.menuSettings }),
    [settings, venue.menuSettings],
  );

  // مسودة المعاينة — فقط عند وجود تعديلات غير محفوظة
  useEffect(() => {
    if (!hydratedRef.current || !dirty) return;
    pushPreviewDraft(settings);
  }, [settings, pushPreviewDraft, dirty]);

  const update = useCallback((next: MenuSettings) => setSettings(next), []);



  const productsColors = getProductsPalette(settings);

  const cropsColors = getCropsPalette(settings);



  const patchProductsColors = useCallback(

    (patch: Partial<MenuPalette>) =>

      update({

        ...settings,

        productsColors: { ...productsColors, ...patch },

      }),

    [settings, productsColors, update],

  );



  const patchCropsColors = useCallback(

    (patch: Partial<MenuPalette>) =>

      update({

        ...settings,

        cropsColors: { ...cropsColors, ...patch },

      }),

    [settings, cropsColors, update],

  );



  const onSave = async () => {

    const userId = getCurrentUserId();

    if (!userId) {

      toast.error("سجّل الدخول أولاً");

      return;

    }

    setSaving(true);

    try {

      updateVenue((v) => ({

        ...v,

        menuSettings: { ...defaultMenuSettings, ...settings },

      }));

      window.dispatchEvent(new Event("meez:venue-updated"));

      setThemePreviewDraft(settings);

      toast.success(usesSupabaseAuth() ? "تم حفظ التعديلات في قاعدة البيانات" : "تم حفظ التعديلات محلياً");

    } catch (err) {

      toast.error(getErrorMessage(err));

    } finally {

      setSaving(false);

    }

  };



  const reset = () => {

    setSettings(defaultMenuSettings);

    updateVenue((v) => ({ ...v, menuSettings: defaultMenuSettings }));

    clearThemePreviewDraft();

    setThemePreviewDraft(defaultMenuSettings);

    toast.success("تمت إعادة الثيم للوضع الافتراضي");

  };



  const onUploadProductsImage = (key: "featuredImage" | "logoImage" | "headerImage") =>

    async (e: ChangeEvent<HTMLInputElement>) => {

      const file = e.target.files?.[0];

      if (!file) return;

      try {

        if (key === "headerImage") {

          const loading = toast.loading("جاري معالجة الصورة…");

          try {

            const dataUrl = await processHeaderImageFile(file);

            update(patchProductsHeader(settings, { headerImage: dataUrl }));

            toast.success("تم رفع صورة الهيدر", { id: loading });

          } catch (err) {

            toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة", { id: loading });

            e.target.value = "";

            return;

          }

          e.target.value = "";

          return;

        }

        const reader = new FileReader();

        reader.onload = () => {

          const result = reader.result as string;

          update(patchProductsHeader(settings, { [key]: result }));

          toast.success("تم رفع الصورة");

        };

        reader.onerror = () => toast.error("تعذّر قراءة الملف");

        reader.readAsDataURL(file);

      } catch (err) {

        toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة");

        e.target.value = "";

      }

    };



  const onUploadCropsImage = (key: "logoImage" | "headerImage") =>

    async (e: ChangeEvent<HTMLInputElement>) => {

      const file = e.target.files?.[0];

      if (!file) return;

      try {

        if (key === "headerImage") {

          const loading = toast.loading("جاري معالجة الصورة…");

          try {

            const dataUrl = await processHeaderImageFile(file);

            update(patchCropsHeader(settings, { headerImage: dataUrl }));

            toast.success("تم رفع بانر هيدر المحاصيل", { id: loading });

          } catch (err) {

            toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة", { id: loading });

            e.target.value = "";

            return;

          }

          e.target.value = "";

          return;

        }

        const reader = new FileReader();

        reader.onload = () => {

          const result = reader.result as string;

          update(patchCropsHeader(settings, { [key]: result }));

          toast.success("تم رفع الصورة");

        };

        reader.onerror = () => toast.error("تعذّر قراءة الملف");

        reader.readAsDataURL(file);

      } catch (err) {

        toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة");

        e.target.value = "";

      }

    };



  const onUploadPaletteBg = (target: "products" | "crops") => async (e: ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {

      const result = reader.result as string;

      if (target === "products") patchProductsColors({ bgImage: result });

      else patchCropsColors({ bgImage: result });

      toast.success("تم رفع صورة الخلفية");

    };

    reader.onerror = () => toast.error("تعذّر قراءة الملف");

    reader.readAsDataURL(file);

    e.target.value = "";

  };



  const patchProductsHeaderSettings = useCallback(

    (patch: Partial<MenuHeaderCustomization>) => update(patchProductsHeader(settings, patch)),

    [settings, update],

  );



  const patchCropsHeaderSettings = useCallback(

    (patch: Partial<MenuHeaderCustomization>) => update(patchCropsHeader(settings, patch)),

    [settings, update],

  );



  return {

    settings,

    update,

    dirty,

    saving,

    venueLoading,

    onSave,

    reset,

    products,

    crops,

    productsColors,

    cropsColors,

    patchProductsColors,

    patchCropsColors,

    patchProductsHeader: patchProductsHeaderSettings,

    patchCropsHeader: patchCropsHeaderSettings,

    onUploadProductsImage,

    onUploadCropsImage,

    onUploadPaletteBg,

  };

}


