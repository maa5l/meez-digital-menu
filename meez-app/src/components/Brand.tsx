import { Text, View, StyleSheet } from "react-native";

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <View style={[styles.wrap, { height: size }]}>
      <Text style={[styles.text, { fontSize: size * 0.55 }]}>ميز</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "800",
    color: "#f5e6c8",
    letterSpacing: 2,
  },
});
