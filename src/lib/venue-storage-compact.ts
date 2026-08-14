import type { Crop, Product } from "@/types/domain";
import type { VenueData } from "@/types/venue";

function compactProduct(p: Product): Product {
  const landscape = p.imageLandscape?.trim() || "";
  const portrait = p.imagePortrait?.trim() || "";
  const legacy = p.image?.trim() || "";
  const next: Product = { ...p };

  if (landscape) next.imageLandscape = landscape;
  else delete next.imageLandscape;

  if (portrait) next.imagePortrait = portrait;
  else delete next.imagePortrait;

  if (landscape) {
    if (legacy && legacy !== landscape) next.image = legacy;
    else delete next.image;
  } else if (legacy) {
    next.image = legacy;
  } else {
    delete next.image;
  }

  return next;
}

function compactCrop(c: Crop): Crop {
  const landscape = c.imageLandscape?.trim() || "";
  const portrait = c.imagePortrait?.trim() || "";
  const legacy = c.image?.trim() || "";
  const next: Crop = { ...c };

  if (landscape) next.imageLandscape = landscape;
  else delete next.imageLandscape;

  if (portrait) next.imagePortrait = portrait;
  else delete next.imagePortrait;

  if (landscape || portrait) {
    delete next.image;
  } else if (legacy) {
    next.image = legacy;
  } else {
    delete next.image;
  }

  return next;
}

/** يقلّل حجم JSON قبل localStorage — إزالة حقول الصور المكررة */
export function compactVenueForLocalStorage(data: VenueData): VenueData {
  return {
    ...data,
    products: data.products.map(compactProduct),
    crops: data.crops.map(compactCrop),
  };
}
