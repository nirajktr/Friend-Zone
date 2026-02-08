import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const { width, height } = Dimensions.get("window");

function FloatingOrb({ delay, x, y, size, color }: { delay: number; x: number; y: number; size: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4000 + delay * 500, useNativeDriver: false, delay: delay * 300 }),
        Animated.timing(anim, { toValue: 0, duration: 4000 + delay * 500, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.35, 0.15] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAction = (actionMode: "create" | "join") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMode(actionMode);
    setShowNameInput(true);
  };

  const handleContinue = () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mode === "create") {
      router.push({ pathname: "/create", params: { name: name.trim() } });
    } else {
      router.push({ pathname: "/join", params: { name: name.trim() } });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <LinearGradient
        colors={["#080C14", "#0D1424", "#111D30", "#0D1424", "#080C14"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <FloatingOrb delay={0} x={width * 0.1} y={height * 0.15} size={180} color="#00E5A0" />
        <FloatingOrb delay={2} x={width * 0.6} y={height * 0.08} size={120} color="#6366F1" />
        <FloatingOrb delay={1} x={width * 0.3} y={height * 0.65} size={140} color="#3B82F6" />
        <FloatingOrb delay={3} x={width * 0.7} y={height * 0.55} size={100} color="#00E5A0" />

        <View style={styles.gridOverlay}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={`h${i}`}
              style={[styles.gridLine, { top: `${(i + 1) * 16}%`, left: 0, right: 0, height: 1 }]}
            />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <View
              key={`v${i}`}
              style={[styles.gridLine, { left: `${(i + 1) * 25}%`, top: 0, bottom: 0, width: 1 }]}
            />
          ))}
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoSection}>
          <View style={styles.iconGlow}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.dark.primary} />
            </View>
          </View>
          <Text style={styles.title}>Friend-Zone</Text>
          <Text style={styles.subtitle}>Walk together. Stay safe.</Text>
        </View>

        {!showNameInput ? (
          <View style={styles.actionSection}>
            <Pressable
              onPress={() => handleAction("create")}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <LinearGradient
                colors={["#00E5A0", "#00C88A", "#00B07A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Start Walk</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => handleAction("join")}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Feather name="link" size={17} color={Colors.dark.primary} />
              <Text style={styles.secondaryButtonText}>Join Walk</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.nameSection}>
            <Text style={styles.namePrompt}>
              {mode === "create" ? "What should we call you?" : "Enter your name"}
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.dark.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={16}
                autoCapitalize="words"
                returnKeyType="go"
                onSubmitEditing={handleContinue}
              />
            </View>
            <Pressable
              onPress={handleContinue}
              disabled={!name.trim()}
              style={({ pressed }) => [
                styles.primaryButton,
                !name.trim() && styles.buttonDisabled,
                pressed && name.trim() ? styles.buttonPressed : null,
              ]}
            >
              <LinearGradient
                colors={name.trim() ? ["#00E5A0", "#00C88A", "#00B07A"] : ["#1C2540", "#1C2540"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    !name.trim() && { color: Colors.dark.textMuted },
                  ]}
                >
                  Continue
                </Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowNameInput(false);
                setMode(null);
                setName("");
              }}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>Back</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
        <Text style={styles.footerText}>Your group. Your safety.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.015)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 56,
  },
  iconGlow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(0, 229, 160, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(0, 229, 160, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 160, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 36,
    color: Colors.dark.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.dark.textSecondary,
    marginTop: 6,
  },
  actionSection: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 8,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.dark.background,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorderLight,
    backgroundColor: "rgba(17, 24, 39, 0.7)",
    gap: 8,
  },
  secondaryButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 17,
    color: Colors.dark.primary,
  },
  nameSection: {
    gap: 14,
  },
  namePrompt: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 20,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 4,
  },
  inputContainer: {
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorderLight,
    paddingHorizontal: 18,
  },
  input: {
    fontFamily: "Outfit_500Medium",
    fontSize: 17,
    color: Colors.dark.text,
    paddingVertical: 17,
  },
  backLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  backLinkText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  footerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
});
