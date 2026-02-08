import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [mode, setMode] = useState<"create" | "join" | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

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
        colors={["#0A0E17", "#0F1A2E", "#0A0E17"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={40} color={Colors.dark.primary} />
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
                colors={["#00E5A0", "#00C08B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="add-circle" size={24} color={Colors.dark.background} />
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
              <Feather name="link" size={20} color={Colors.dark.primary} />
              <Text style={styles.secondaryButtonText}>Join Walk</Text>
            </Pressable>

            <View style={styles.howItWorks}>
              <View style={styles.step}>
                <View style={styles.stepDot}>
                  <Text style={styles.stepNum}>1</Text>
                </View>
                <Text style={styles.stepText}>Host starts a walk</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <View style={styles.stepDot}>
                  <Text style={styles.stepNum}>2</Text>
                </View>
                <Text style={styles.stepText}>Friends scan or enter code</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <View style={styles.stepDot}>
                  <Text style={styles.stepNum}>3</Text>
                </View>
                <Text style={styles.stepText}>Stay tethered, stay safe</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.nameSection}>
            <Text style={styles.namePrompt}>
              {mode === "create" ? "What should we call you?" : "Enter your name"}
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={18} color={Colors.dark.textMuted} />
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
                colors={name.trim() ? ["#00E5A0", "#00C08B"] : ["#2A3040", "#2A3040"]}
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
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={name.trim() ? Colors.dark.background : Colors.dark.textMuted}
                />
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
      </View>

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
  bgOrb1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(0, 229, 160, 0.04)",
    top: -50,
    right: -100,
  },
  bgOrb2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59, 130, 246, 0.04)",
    bottom: 100,
    left: -60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.dark.primaryDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 36,
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 6,
  },
  actionSection: {
    gap: 16,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
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
    fontSize: 18,
    color: Colors.dark.background,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
    gap: 10,
  },
  secondaryButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 18,
    color: Colors.dark.primary,
  },
  howItWorks: {
    marginTop: 32,
    gap: 4,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  stepLine: {
    width: 1,
    height: 12,
    backgroundColor: Colors.dark.cardBorder,
    marginLeft: 14,
  },
  stepText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  nameSection: {
    gap: 16,
  },
  namePrompt: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 22,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Outfit_500Medium",
    fontSize: 17,
    color: Colors.dark.text,
    paddingVertical: 18,
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
