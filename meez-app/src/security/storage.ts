import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "meez:device-pending-code";

export async function getDeviceCode(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setDeviceCode(code: string): Promise<void> {
  await AsyncStorage.setItem(KEY, code);
}
