import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

async function read(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

async function write(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

export async function getDeviceCode(): Promise<string | null> {
  return read("meez:device-pending-code");
}

export async function setDeviceCode(code: string): Promise<void> {
  await write("meez:device-pending-code", code);
}
