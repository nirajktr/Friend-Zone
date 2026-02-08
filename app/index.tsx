import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

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
        colors={["#0A0E17", "#101828", "#0A0E17"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={36} color={Colors.dark.primary} />
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
              <Feather name="link" size={18} color={Colors.dark.primary} />
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
                colors={name.trim() ? ["#00E5A0", "#00C08B"] : ["#1E2640", "#1E2640"]}
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
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 52,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.dark.primaryDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 34,
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  actionSection: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
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
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
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
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: 16,
  },
  input: {
    fontFamily: "Outfit_500Medium",
    fontSize: 17,
    color: Colors.dark.text,
    paddingVertical: 16,
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
