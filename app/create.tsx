import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createWalkSocket } from "@/lib/websocket";
import { getMemberColor } from "@/lib/location-utils";

const { width } = Dimensions.get("window");

export default function CreateScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState<string | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const navigatingRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    if (code) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [code]);

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
      <LinearGradient
        colors={["#080C14", "#0D1424", "#111D30", "#0D1424", "#080C14"]}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.bgOrb, { top: "8%", left: "15%", width: 160, height: 160, backgroundColor: "rgba(0, 229, 160, 0.05)" }]} />
        <View style={[styles.bgOrb, { top: "40%", right: "10%", width: 120, height: 120, backgroundColor: "rgba(99, 102, 241, 0.05)" }]} />
      </View>

      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {code ? (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], width: "100%", alignItems: "center" as const }}>
            <View style={styles.qrCard}>
              <View style={styles.qrGlow}>
                <View style={styles.qrInner}>
                  <QRCode
                    value={code}
                    size={150}
                    backgroundColor="#FFFFFF"
                    color="#080C14"
                  />
                </View>
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
              <View style={styles.membersHeader}>
                <Text style={styles.membersTitle}>Group</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{members.length}</Text>
                </View>
              </View>
              {members.map((member, idx) => (
                <View key={member} style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: getMemberColor(idx) }]}>
                    <Ionicons name="person" size={11} color="#FFF" />
                  </View>
                  <Text style={styles.memberName}>{member}</Text>
                  {idx === 0 && (
                    <View style={styles.hostBadge}>
                      <Text style={styles.hostBadgeText}>Host</Text>
                    </View>
                  )}
                </View>
              ))}
              {members.length < 2 && (
                <View style={styles.waitingRow}>
                  <View style={styles.waitingDot} />
                  <Text style={styles.waitingText}>Waiting for friends...</Text>
                </View>
              )}
            </View>
          </Animated.View>
        ) : error ? (
          <View style={styles.centerMessage}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={28} color={Colors.dark.danger} />
            </View>
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
            colors={["#00E5A0", "#00C88A", "#00B07A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startButtonInner}
          >
            <Ionicons name="walk" size={20} color={Colors.dark.background} />
            <Text style={styles.startButtonText}>Begin Walk</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.startButtonInner, { backgroundColor: Colors.dark.card }]}>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 16,
    gap: 14,
  },
  qrCard: {
    width: "100%",
    backgroundColor: "rgba(17, 24, 39, 0.7)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorderLight,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 20,
  },
  qrGlow: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0, 229, 160, 0.06)",
  },
  qrInner: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  codeRow: {
    flexDirection: "row",
    gap: 8,
  },
  codeChar: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.dark.background,
    borderWidth: 1.5,
    borderColor: "rgba(0, 229, 160, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  codeCharText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: Colors.dark.primaryLight,
  },
  shareHint: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  membersCard: {
    width: "100%",
    backgroundColor: "rgba(17, 24, 39, 0.7)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorderLight,
    padding: 18,
    gap: 2,
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  membersTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  countBadge: {
    backgroundColor: Colors.dark.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: Colors.dark.primary,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  memberAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  memberName: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.dark.text,
    flex: 1,
  },
  hostBadge: {
    backgroundColor: Colors.dark.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 160, 0.15)",
  },
  hostBadgeText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.dark.primary,
  },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  waitingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.textMuted,
  },
  waitingText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  centerMessage: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 80,
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.dangerDim,
    justifyContent: "center",
    alignItems: "center",
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
    borderRadius: 16,
    overflow: "hidden",
  },
  startButtonDisabled: {
    borderRadius: 16,
  },
  startButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 8,
    borderRadius: 16,
  },
  startButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.dark.background,
  },
});
