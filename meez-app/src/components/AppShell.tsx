import { useEffect, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SystemBars } from "react-native-edge-to-edge";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";

export const APP_BACKGROUND = "#1a1510";

type Props = {
  children: ReactNode;
  /** Hide status bar on menu WebView */
  immersive?: boolean;
};

export function AppShell({ children, immersive = false }: Props) {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    void SystemUI.setBackgroundColorAsync(APP_BACKGROUND);
    void NavigationBar.setBackgroundColorAsync(APP_BACKGROUND);
    void NavigationBar.setButtonStyleAsync("light");
    void NavigationBar.setPositionAsync("absolute");

    if (immersive) {
      void NavigationBar.setVisibilityAsync("hidden");
    } else {
      void NavigationBar.setVisibilityAsync("visible");
    }
  }, [immersive]);

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <SystemBars style="light" hidden={immersive} />
        {children}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
  },
});
