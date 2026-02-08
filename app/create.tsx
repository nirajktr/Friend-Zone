import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createWalkSocket } from "@/lib/websocket";
import { getMemberColor } from "@/lib/location-utils";

export default function CreateScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState<string | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const navigatingRef = useRef(false);

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
      if (!navigatingRef.current && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "end" }));
      }
      ws.close();
    };
  }, [name]);

  const handleStartWalk = () => {
    navigatingRef.current = true;
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
          paddingTop: insets.top + webTopInset + 8,
          paddingBottom: insets.bottom + webBottomInset + 16,
        },
      ]}
    >
      <Pressable onPress={handleBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
      </Pressable>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {code ? (
          <>
            <View style={styles.qrCard}>
              <View style={styles.qrInner}>
                <QRCode
                  value={code}
                  size={160}
                  backgroundColor="#FFFFFF"
                  color="#0A0E17"
                />
              </View>
              <View style={styles.codeRow}>
                {code.split("").map((char, i) => (
                  <View key={i} style={styles.codeChar}>
                    <Text style={styles.codeCharText}>{char}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.shareHint}>Share this code with your group</Text>
            </View>

            <View style={styles.membersCard}>
              <Text style={styles.membersTitle}>
                Group ({members.length})
              </Text>
              {members.map((member, idx) => (
                <View key={member} style={styles.memberRow}>
                  <View
                    style={[
                      styles.memberDot,
                      { backgroundColor: getMemberColor(idx) },
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
                <Text style={styles.waitingText}>Waiting for friends...</Text>
              )}
            </View>
          </>
        ) : error ? (
          <View style={styles.centerMessage}>
            <Ionicons name="alert-circle" size={28} color={Colors.dark.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.centerMessage}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
            <Text style={styles.loadingText}>Creating walk...</Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={handleStartWalk}
        disabled={!code}
        style={({ pressed }) => [
          styles.startButton,
          !code && styles.startButtonDisabled,
          pressed && code ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        {code ? (
          <LinearGradient
            colors={["#00E5A0", "#00C08B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startButtonInner}
          >
            <Ionicons name="walk" size={20} color={Colors.dark.background} />
            <Text style={styles.startButtonText}>Begin Walk</Text>
          </LinearGradient>
        ) : (
          <View style={styles.startButtonInner}>
            <Text style={[styles.startButtonText, { color: Colors.dark.textMuted }]}>
              Begin Walk
            </Text>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
    gap: 16,
  },
  qrCard: {
    width: "100%",
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 20,
  },
  qrInner: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  codeRow: {
    flexDirection: "row",
    gap: 8,
  },
  codeChar: {
    width: 42,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  codeCharText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: Colors.dark.primary,
  },
  shareHint: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  membersCard: {
    width: "100%",
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 16,
    gap: 4,
  },
  membersTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  memberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberName: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.dark.text,
    flex: 1,
  },
  hostBadge: {
    backgroundColor: Colors.dark.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hostBadgeText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.dark.primary,
  },
  waitingText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textMuted,
    textAlign: "center",
    paddingVertical: 8,
  },
  centerMessage: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 80,
  },
  errorText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.dark.danger,
  },
  loadingText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  startButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  startButtonDisabled: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
  },
  startButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  startButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.dark.background,
  },
});
