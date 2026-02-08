import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createWalkSocket } from "@/lib/websocket";

export default function CreateScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState<string | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    const ws = createWalkSocket();
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "create", name: name || "Host" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "created":
            setCode(msg.code);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case "members":
            setMembers(msg.members);
            break;
          case "error":
            setError(msg.message);
            break;
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    };

    ws.onerror = () => {
      setError("Connection failed");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "end" }));
      }
      ws.close();
    };
  }, [name]);

  const handleStartWalk = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace({
      pathname: "/walk",
      params: { name: name || "Host", code: code || "", isHost: "true" },
    });
  };

  const handleBack = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end" }));
    }
    router.back();
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset + 12,
          paddingBottom: insets.bottom + webBottomInset + 16,
        },
      ]}
    >
      <Pressable onPress={handleBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.heading}>Your Walk</Text>
        <Text style={styles.subheading}>Share this code with your group</Text>

        {code ? (
          <>
            <View style={styles.qrContainer}>
              <View style={styles.qrInner}>
                <QRCode
                  value={code}
                  size={180}
                  backgroundColor="#FFFFFF"
                  color="#0A0E17"
                />
              </View>
            </View>

            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Walk Code</Text>
              <View style={styles.codeRow}>
                {code.split("").map((char, i) => (
                  <View key={i} style={styles.codeChar}>
                    <Text style={styles.codeCharText}>{char}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={32} color={Colors.dark.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
            <Text style={styles.loadingText}>Creating walk...</Text>
          </View>
        )}

        <View style={styles.membersSection}>
          <View style={styles.membersHeader}>
            <Feather name="users" size={18} color={Colors.dark.textSecondary} />
            <Text style={styles.membersTitle}>
              {members.length} {members.length === 1 ? "member" : "members"}
            </Text>
          </View>
          {members.map((member, idx) => (
            <View key={member} style={styles.memberRow}>
              <View
                style={[
                  styles.memberDot,
                  {
                    backgroundColor:
                      idx === 0 ? Colors.dark.primary : Colors.dark.secondary,
                  },
                ]}
              />
              <Text style={styles.memberName}>{member}</Text>
              {idx === 0 && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              )}
            </View>
          ))}
          {members.length < 2 && (
            <Text style={styles.waitingText}>Waiting for friends to join...</Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleStartWalk}
        disabled={!code}
        style={({ pressed }) => [
          styles.startButton,
          !code && styles.startButtonDisabled,
          pressed && code ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        <Ionicons
          name="walk"
          size={22}
          color={code ? Colors.dark.background : Colors.dark.textMuted}
        />
        <Text
          style={[
            styles.startButtonText,
            !code && { color: Colors.dark.textMuted },
          ]}
        >
          Begin Walk
        </Text>
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
  },
  heading: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.dark.textSecondary,
    marginBottom: 28,
  },
  qrContainer: {
    padding: 3,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    marginBottom: 24,
  },
  qrInner: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  codeContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  codeLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeRow: {
    flexDirection: "row",
    gap: 8,
  },
  codeChar: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  codeCharText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.dark.primary,
  },
  errorContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
  },
  errorText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 16,
    color: Colors.dark.danger,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  membersSection: {
    width: "100%",
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 16,
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  membersTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  memberDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  memberName: {
    fontFamily: "Outfit_500Medium",
    fontSize: 16,
    color: Colors.dark.text,
    flex: 1,
  },
  hostBadge: {
    backgroundColor: Colors.dark.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hostBadgeText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.dark.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  waitingText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: "center",
    marginTop: 8,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  startButtonDisabled: {
    backgroundColor: Colors.dark.card,
  },
  startButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.dark.background,
  },
});
