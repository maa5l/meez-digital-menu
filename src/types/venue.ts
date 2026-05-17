import type { Category, Product, Device, MenuSettings } from "@/types/domain";
import type { Crop } from "@/types/domain";

export type SubscriptionInfo = {
  plan: string;
  status: string;
  screens: number;
  maxScreens: number;
  pricePerScreen: number;
  renewsOn: string;
  daysLeft: number;
};

/** بيانات منشأة واحدة — معزولة لكل حساب (SaaS tenant) */
export type VenueData = {
  version: 1;
  categories: Category[];
  products: Product[];
  crops: Crop[];
  devices: Device[];
  menuSettings: MenuSettings;
  subscription: SubscriptionInfo;
  createdAt: string;
  updatedAt: string;
};
