/**
 * Realtime disabled after Security Hardening v2 (no anon SELECT on device_activations).
 */

/** @deprecated v2 RPC-only — استخدم polling */
export function subscribeDeviceActivationChanges(
  _code: string,
  _onChange: () => void,
): () => void {
  return () => {};
}
