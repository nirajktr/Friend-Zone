import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createWalkSocket } from "@/lib/websocket";

export default function JoinScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

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
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.heading}>Join a Walk</Text>
        <Text style={styles.subheading}>
          Enter the 5-character code from your friend
        </Text>

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
            </View>
          ))}
        </View>

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
            <Ionicons name="alert-circle" size={15} color={Colors.dark.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

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
          <View style={styles.joinButtonInner}>
            <ActivityIndicator color={Colors.dark.background} />
          </View>
        ) : (
          <LinearGradient
            colors={code.length >= 5 ? ["#00E5A0", "#00C08B"] : ["#1E2640", "#1E2640"]}
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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  subheading: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  codeInputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  codeBox: {
    width: 50,
    height: 58,
    borderRadius: 12,
    backgroundColor: Colors.dark.card,
    borderWidth: 1.5,
    borderColor: Colors.dark.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  codeBoxActive: {
    borderColor: Colors.dark.primary,
  },
  codeBoxFilled: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primaryDim,
  },
  codeBoxText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.dark.textMuted,
  },
  codeBoxTextFilled: {
    color: Colors.dark.primary,
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
    gap: 6,
  },
  errorText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.dark.danger,
  },
  joinButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  joinButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.dark.background,
  },
});
