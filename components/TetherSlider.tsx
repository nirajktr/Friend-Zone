import React from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface TetherSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
}

const SLIDER_WIDTH = Dimensions.get("window").width - 64;
const THUMB_SIZE = 28;

export default function TetherSlider({
  value,
  onValueChange,
  min = 20,
  max = 300,
}: TetherSliderProps) {
  const fraction = (value - min) / (max - min);
  const thumbLeft = fraction * (SLIDER_WIDTH - THUMB_SIZE);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {},
    onPanResponderMove: (_evt, gestureState) => {
      const newX = thumbLeft + gestureState.dx;
      const clampedX = Math.max(0, Math.min(newX, SLIDER_WIDTH - THUMB_SIZE));
      const newFraction = clampedX / (SLIDER_WIDTH - THUMB_SIZE);
      const newValue = Math.round(min + newFraction * (max - min));
      onValueChange(newValue);
    },
    onPanResponderRelease: () => {},
  });

  const getLabel = () => {
    if (value <= 50) return "Tight";
    if (value <= 100) return "Close";
    if (value <= 200) return "Moderate";
    return "Loose";
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Tether Distance</Text>
        <View style={styles.valuePill}>
          <Text style={styles.valueText}>{value} ft</Text>
          <View style={styles.modeDivider} />
          <Text style={styles.modeText}>{getLabel()}</Text>
        </View>
      </View>
      <View style={styles.trackContainer}>
        <View style={styles.track}>
          <LinearGradient
            colors={["#00E5A0", "#00B07A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.trackFill, { width: thumbLeft + THUMB_SIZE / 2 }]}
          />
        </View>
        <View
          style={[styles.thumb, { left: thumbLeft }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.thumbInner} />
        </View>
      </View>
      <View style={styles.tickRow}>
        <Text style={styles.tickText}>{min}ft</Text>
        <Text style={styles.tickText}>{max}ft</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  valuePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primaryDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 160, 0.12)",
  },
  valueText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.dark.primary,
  },
  modeDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(0, 229, 160, 0.2)",
  },
  modeText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.primary,
    opacity: 0.7,
  },
  trackContainer: {
    height: 40,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 5,
    backgroundColor: Colors.dark.cardBorder,
    borderRadius: 3,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.dark.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.background,
  },
  tickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  tickText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.dark.textMuted,
  },
});
