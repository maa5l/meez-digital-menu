import { Image, StyleSheet, View } from "react-native";

const LOGO = require("../../assets/icon.png");

export function Logo({ size = 56 }: { size?: number }) {
  const width = Math.round(size * (1031 / 736));

  return (
    <View style={[styles.wrap, { height: size, width }]}>
      <Image
        source={LOGO}
        style={{ width, height: size }}
        resizeMode="contain"
        accessibilityLabel="ميز"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
