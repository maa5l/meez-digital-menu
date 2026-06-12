/**
 * Realtime subscriptions disabled after Security Hardening v2 (RPC-only table access).
 * Kiosk and dashboard sync via polling + RPC (get_kiosk_state / get_owner_venue).
 */

/** @deprecated v2 RPC-only — استخدم polling */
export function subscribeDeviceActivationChanges(
  _code: string,
  _onChange: () => void,
): () => void {
  return () => {};
}

/** @deprecated v2 RPC-only — استخدم get_owner_venue + polling */
export function subscribeVenueChanges(_ownerId: string, _onChange: () => void): () => void {
  return () => {};
}
