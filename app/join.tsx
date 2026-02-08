import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createWalkSocket } from "@/lib/websocket";

const { width } = Dimensions.get("window");

export default function JoinScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleJoin = () => {
    if (code.length < 5) return;
    setLoading(true);
    setError(null);

    const ws = createWalkSocket();

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", code: code.toUpperCase(), name: name || "Friend" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "joined") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          ws.close();
          router.replace({
            pathname: "/walk",
            params: { name: name || "Friend", code: msg.code, isHost: "false" },
          });
        } else if (msg.type === "error") {
          setError(msg.message);
          setLoading(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          ws.close();
        }
      } catch (e) {
        setError("Connection failed");
        setLoading(false);
      }
    };

    ws.onerror = () => {
      setError("Could not connect");
      setLoading(false);
    };
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length <= 5) {
      setCode(cleaned);
      setError(null);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset + 8,
          paddingBottom: insets.bottom + webBottomInset + 16,
        },
      ]}
    >
      <LinearGradient
        colors={["#080C14", "#0D1424", "#111D30", "#0D1424", "#080C14"]}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.bgOrb, { top: "20%", right: "10%", width: 140, height: 140, backgroundColor: "rgba(99, 102, 241, 0.05)" }]} />
        <View style={[styles.bgOrb, { bottom: "25%", left: "5%", width: 120, height: 120, backgroundColor: "rgba(0, 229, 160, 0.04)" }]} />
      </View>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.heading}>Join a Walk</Text>
        <Text style={styles.subheading}>
          Enter the 5-character code from your friend
        </Text>

        <Pressable style={styles.codeInputArea} onPress={() => {}}>
          <View style={styles.codeInputRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.codeBox,
                  code.length === i && styles.codeBoxActive,
                  code[i] && styles.codeBoxFilled,
                ]}
              >
                <Text
                  style={[
                    styles.codeBoxText,
                    code[i] && styles.codeBoxTextFilled,
                  ]}
                >
                  {code[i] || ""}
                </Text>
                {code.length === i && <View style={styles.cursor} />}
              </View>
            ))}
          </View>
        </Pressable>

        <TextInput
          style={styles.hiddenInput}
          value={code}
          onChangeText={handleCodeChange}
          autoFocus
          maxLength={5}
          autoCapitalize="characters"
          returnKeyType="go"
          onSubmitEditing={handleJoin}
        />

        {error && (
          <View style={styles.errorRow}>
            <View style={styles.errorDot} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </Animated.View>

      <Pressable
        onPress={handleJoin}
        disabled={code.length < 5 || loading}
        style={({ pressed }) => [
          styles.joinButton,
          (code.length < 5 || loading) && styles.joinButtonDisabled,
          pressed && code.length >= 5 ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        {loading ? (
          <View style={[styles.joinButtonInner, { backgroundColor: Colors.dark.primary }]}>
            <ActivityIndicator color={Colors.dark.background} />
          </View>
        ) : (
          <LinearGradient
            colors={code.length >= 5 ? ["#00E5A0", "#00C88A", "#00B07A"] : ["#1C2540", "#1C2540"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.joinButtonInner}
          >
            <Text
              style={[
                styles.joinButtonText,
                code.length < 5 && { color: Colors.dark.textMuted },
              ]}
            >
              Join Walk
            </Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 24,
  },
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontFamily: "Outfit_700Bold",
    fontSize: 30,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: 36,
  },
  codeInputArea: {
    marginBottom: 16,
  },
  codeInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  codeBox: {
    width: 52,
    height: 62,
    borderRadius: 14,
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    borderWidth: 1.5,
    borderColor: Colors.dark.cardBorderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  codeBoxActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: "rgba(0, 229, 160, 0.04)",
  },
  codeBoxFilled: {
    borderColor: "rgba(0, 229, 160, 0.35)",
    backgroundColor: "rgba(0, 229, 160, 0.08)",
  },
  codeBoxText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 24,
    color: Colors.dark.textMuted,
  },
  codeBoxTextFilled: {
    color: Colors.dark.primaryLight,
  },
  cursor: {
    position: "absolute",
    bottom: 14,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.dark.primary,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.danger,
  },
  errorText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.dark.danger,
  },
  joinButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 8,
    borderRadius: 16,
  },
  joinButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.dark.background,
  },
});
