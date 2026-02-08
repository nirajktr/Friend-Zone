import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  Animated as RNAnimated,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import TetherSlider from "@/components/TetherSlider";
import { MapWrapper, MapMarker, MapCircle } from "@/components/MapViewWrapper";
import {
  createWalkSocket,
  type MemberLocation,
} from "@/lib/websocket";
import {
  calculateCentroid,
  distanceInFeet,
  timeAgo,
  getMemberColor,
} from "@/lib/location-utils";

export default function WalkScreen() {
  const { name, code, isHost } = useLocalSearchParams<{
    name: string;
    code: string;
    isHost: string;
  }>();
  const insets = useSafeAreaInsets();
  const host = isHost === "true";
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [members, setMembers] = useState<MemberLocation[]>([]);
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [tetherDistance, setTetherDistance] = useState(50);
  const [separated, setSeparated] = useState<
    { name: string; distance: number; lastUpdate: number; latitude: number | null; longitude: number | null }[]
  >([]);
  const [showControls, setShowControls] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const mapRef = useRef<any>(null);
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;
  const loadingPulse = useRef(new RNAnimated.Value(0.4)).current;

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(loadingPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(loadingPulse, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (separated.length > 0) {
      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [separated.length]);

  const alertBgColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255, 71, 87, 0.1)", "rgba(255, 71, 87, 0.25)"],
  });

  useEffect(() => {
    const ws = createWalkSocket();
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          code: code?.toUpperCase(),
          name: name || "User",
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "joined":
          case "error":
            break;
          case "members":
            setMemberNames(msg.members);
            break;
          case "locations":
            setMembers(msg.members);
            break;
          case "tether_distance":
            setTetherDistance(msg.distance);
            break;
          case "ended":
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (Platform.OS === "web") {
              router.replace("/");
            } else {
              Alert.alert("Walk Ended", "The host has ended this walk.", [
                { text: "OK", onPress: () => router.replace("/") },
              ]);
            }
            break;
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [code, name]);

  const sendLocation = useCallback(
    (latitude: number, longitude: number) => {
      setMyLat(latitude);
      setMyLng(longitude);
      setLoading(false);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "location", latitude, longitude })
        );
      }
    },
    []
  );

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let watchId: number | undefined;

    (async () => {
      if (Platform.OS === "web") {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
              });
            }
          );
          setLocationGranted(true);
          sendLocation(position.coords.latitude, position.coords.longitude);

          watchId = navigator.geolocation.watchPosition(
            (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
          );
        } catch {
          setLocationGranted(false);
          setLoading(false);
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationGranted(false);
        setLoading(false);
        return;
      }
      setLocationGranted(true);

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      sendLocation(current.coords.latitude, current.coords.longitude);

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (loc) => sendLocation(loc.coords.latitude, loc.coords.longitude)
      );
    })();

    return () => {
      if (sub) sub.remove();
      if (watchId !== undefined && Platform.OS === "web") {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [sendLocation]);

  useEffect(() => {
    const centroid = calculateCentroid(members);
    if (!centroid) {
      setSeparated([]);
      return;
    }

    const sep = members
      .filter((m) => m.latitude !== null && m.longitude !== null)
      .map((m) => ({
        ...m,
        distance: distanceInFeet(m.latitude!, m.longitude!, centroid.latitude, centroid.longitude),
      }))
      .filter((m) => m.distance > tetherDistance);

    if (sep.length > 0 && separated.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setSeparated(sep);
  }, [members, tetherDistance]);

  const handleTetherChange = (val: number) => {
    setTetherDistance(val);
    if (host && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "tether_distance", distance: val }));
    }
  };

  const handleEndWalk = () => {
    if (Platform.OS === "web") {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "end" }));
      }
      router.replace("/");
      return;
    }
    Alert.alert("End Walk", "This will end the walk for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Walk",
        style: "destructive",
        onPress: () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "end" }));
          }
          router.replace("/");
        },
      },
    ]);
  };

  const handleLeave = () => {
    wsRef.current?.close();
    router.replace("/");
  };

  const centroid = calculateCentroid(members);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <LinearGradient
          colors={["#080C14", "#0D1424", "#111D30", "#0D1424", "#080C14"]}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.loadingOrb, { top: "30%", left: "20%", width: 160, height: 160, backgroundColor: "rgba(0, 229, 160, 0.04)" }]} />
          <View style={[styles.loadingOrb, { top: "50%", right: "15%", width: 120, height: 120, backgroundColor: "rgba(99, 102, 241, 0.04)" }]} />
        </View>
        <RNAnimated.View style={[styles.loadingContent, { opacity: loadingPulse }]}>
          <View style={styles.loadingIconWrap}>
            <Ionicons name="locate" size={32} color={Colors.dark.primary} />
          </View>
        </RNAnimated.View>
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  const mapRegion = myLat != null && myLng != null
    ? { latitude: myLat, longitude: myLng, latitudeDelta: 0.003, longitudeDelta: 0.003 }
    : null;

  return (
    <View style={styles.container}>
      <MapWrapper
        mapRef={mapRef}
        initialRegion={mapRegion ?? { latitude: 0, longitude: 0, latitudeDelta: 10, longitudeDelta: 10 }}
        region={mapRegion ?? undefined}
      >
        {centroid && (
          <MapCircle
            center={centroid}
            radius={tetherDistance * 0.3048}
            strokeColor="rgba(0, 229, 160, 0.3)"
            fillColor="rgba(0, 229, 160, 0.05)"
            strokeWidth={2}
          />
        )}

        {centroid && (
          <MapMarker coordinate={centroid} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.centroidMarker}>
              <View style={styles.centroidDot} />
            </View>
          </MapMarker>
        )}

        {members
          .filter((m) => m.latitude !== null && m.longitude !== null)
          .map((m, idx) => {
            const isSep = separated.some((s) => s.name === m.name);
            const mIdx = memberNames.indexOf(m.name);
            const color = getMemberColor(mIdx >= 0 ? mIdx : idx);
            return (
              <MapMarker
                key={m.name}
                coordinate={{ latitude: m.latitude!, longitude: m.longitude! }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.memberMarkerWrap}>
                  <View
                    style={[
                      styles.memberPin,
                      { backgroundColor: isSep ? Colors.dark.danger : color },
                      isSep && styles.memberPinDanger,
                    ]}
                  >
                    <Ionicons name="person" size={12} color="#FFF" />
                  </View>
                  <Text style={[styles.pinLabel, isSep && { color: Colors.dark.danger }]}>
                    {m.name}
                  </Text>
                </View>
              </MapMarker>
            );
          })}
      </MapWrapper>

      <View style={[styles.topBar, { paddingTop: insets.top + webTopInset + 6 }]}>
        <View style={styles.topRow}>
          <View style={[styles.pill, separated.length > 0 && styles.pillDanger]}>
            <View
              style={[
                styles.pillDot,
                { backgroundColor: separated.length > 0 ? Colors.dark.danger : Colors.dark.primary },
              ]}
            />
            <Text style={[styles.pillText, separated.length > 0 && { color: Colors.dark.danger }]}>
              {separated.length > 0 ? `${separated.length} separated` : "All safe"}
            </Text>
          </View>

          <View style={styles.pill}>
            <Feather name="users" size={13} color={Colors.dark.text} />
            <Text style={styles.pillText}>{memberNames.length}</Text>
          </View>
        </View>
      </View>

      {separated.length > 0 && (
        <RNAnimated.View
          style={[
            styles.alertBanner,
            { top: insets.top + webTopInset + 56, backgroundColor: alertBgColor },
          ]}
        >
          <View style={styles.alertIconWrap}>
            <Ionicons name="warning" size={16} color={Colors.dark.danger} />
          </View>
          <View style={styles.alertContent}>
            {separated.map((s) => (
              <View key={s.name} style={styles.alertRow}>
                <Text style={styles.alertName}>{s.name}</Text>
                <Text style={styles.alertDist}>{Math.round(s.distance)}ft</Text>
                <Text style={styles.alertTime}>{timeAgo(s.lastUpdate)}</Text>
              </View>
            ))}
          </View>
        </RNAnimated.View>
      )}

      {!locationGranted && !loading && (
        <View style={styles.permBanner}>
          <View style={styles.permIconWrap}>
            <Ionicons name="location" size={16} color={Colors.dark.secondary} />
          </View>
          <Text style={styles.permText}>Location access is needed</Text>
          {Platform.OS !== "web" && (
            <Pressable
              onPress={async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === "granted") setLocationGranted(true);
              }}
              style={styles.permButton}
            >
              <Text style={styles.permAction}>Grant</Text>
            </Pressable>
          )}
        </View>
      )}

      <View
        style={[
          styles.bottomPanel,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8 },
        ]}
      >
        <LinearGradient
          colors={["rgba(8, 12, 20, 0.95)", "rgba(8, 12, 20, 0.98)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <Pressable
          onPress={() => {
            setShowControls(!showControls);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={styles.grabberArea}
        >
          <View style={styles.grabber} />
        </Pressable>

        {showControls ? (
          <View style={styles.controlsBody}>
            {host ? (
              <TetherSlider value={tetherDistance} onValueChange={handleTetherChange} />
            ) : (
              <View style={styles.tetherRow}>
                <Text style={styles.tetherLabel}>Tether</Text>
                <View style={styles.tetherValuePill}>
                  <Text style={styles.tetherVal}>{tetherDistance} ft</Text>
                </View>
              </View>
            )}

            <View style={styles.membersList}>
              {memberNames.map((mn, idx) => {
                const loc = members.find((m) => m.name === mn);
                const isSep = separated.some((s) => s.name === mn);
                const dist =
                  centroid && loc?.latitude != null && loc?.longitude != null
                    ? distanceInFeet(loc.latitude, loc.longitude, centroid.latitude, centroid.longitude)
                    : null;
                return (
                  <View key={mn} style={styles.mlRow}>
                    <View style={[styles.mlAvatar, { backgroundColor: isSep ? Colors.dark.danger : getMemberColor(idx) }]}>
                      <Ionicons name="person" size={10} color="#FFF" />
                    </View>
                    <Text style={[styles.mlName, isSep && { color: Colors.dark.danger }]}>{mn}</Text>
                    {dist != null && (
                      <Text style={[styles.mlDist, isSep && { color: Colors.dark.danger }]}>
                        {Math.round(dist)}ft
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={host ? handleEndWalk : handleLeave}
              style={({ pressed }) => [styles.endBtn, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name={host ? "stop-circle" : "exit"} size={16} color={Colors.dark.danger} />
              <Text style={styles.endBtnText}>{host ? "End Walk" : "Leave"}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.miniBar}>
            <View style={styles.miniLeft}>
              <View
                style={[
                  styles.miniDot,
                  { backgroundColor: separated.length > 0 ? Colors.dark.danger : Colors.dark.primary },
                ]}
              />
              <Text style={styles.miniText}>
                {separated.length > 0 ? `${separated.length} separated` : "All safe"}
              </Text>
            </View>
            <View style={styles.miniTetherPill}>
              <Text style={styles.miniTether}>{tetherDistance}ft</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0, 229, 160, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 160, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.dark.textSecondary,
    marginTop: 8,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    zIndex: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(8, 12, 20, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 7,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorderLight,
  },
  pillDanger: {
    borderColor: "rgba(255, 71, 87, 0.2)",
    backgroundColor: "rgba(255, 71, 87, 0.08)",
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pillText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.text,
  },
  alertBanner: {
    position: "absolute",
    left: 14,
    right: 14,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.2)",
    zIndex: 10,
  },
  alertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 71, 87, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContent: {
    flex: 1,
    gap: 4,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  alertName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.danger,
    flex: 1,
  },
  alertDist: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: Colors.dark.danger,
  },
  alertTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: "rgba(255, 71, 87, 0.5)",
  },
  permBanner: {
    position: "absolute",
    top: "45%",
    left: 20,
    right: 20,
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorderLight,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 10,
  },
  permIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  permText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  permButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.dark.primaryDim,
  },
  permAction: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.primary,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.dark.cardBorderLight,
    overflow: "hidden",
  },
  grabberArea: {
    alignItems: "center",
    paddingVertical: 10,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textMuted,
  },
  controlsBody: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 10,
  },
  tetherRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tetherLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  tetherValuePill: {
    backgroundColor: Colors.dark.primaryDim,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tetherVal: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.dark.primary,
  },
  membersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  mlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mlAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  mlName: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.dark.text,
    flex: 1,
  },
  mlDist: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 14,
    backgroundColor: Colors.dark.dangerDim,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.15)",
    gap: 6,
  },
  endBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.danger,
  },
  miniBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  miniLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  miniDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  miniText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.text,
  },
  miniTetherPill: {
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  miniTether: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  centroidMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 229, 160, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  centroidDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.primary,
  },
  memberMarkerWrap: {
    alignItems: "center",
    gap: 2,
  },
  memberPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  memberPinDanger: {
    borderColor: "rgba(255, 71, 87, 0.4)",
  },
  pinLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 10,
    color: Colors.dark.text,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
