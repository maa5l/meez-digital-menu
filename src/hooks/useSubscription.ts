export {
  notifySubscriptionUpdated,
  useSubscriptionContext as useSubscription,
  type SubscriptionLoadState,
} from "@/context/SubscriptionContext";

/** مزامنة الاشتراك تتم داخل SubscriptionProvider — لا حاجة لاستدعاء منفصل */
export function useSyncVenueSubscription(): void {
  // no-op: kept for compatibility with older call sites
}
