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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
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

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timeout);
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
    outputRange: ["rgba(255, 71, 87, 0.15)", "rgba(255, 71, 87, 0.35)"],
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
        <ActivityIndicator size="large" color={Colors.dark.primary} />
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
            strokeColor="rgba(0, 229, 160, 0.35)"
            fillColor="rgba(0, 229, 160, 0.06)"
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
          <View style={styles.pill}>
            <View
              style={[
                styles.pillDot,
                { backgroundColor: separated.length > 0 ? Colors.dark.danger : Colors.dark.primary },
              ]}
            />
            <Text style={styles.pillText}>
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
          <Ionicons name="warning" size={18} color={Colors.dark.danger} />
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
          <Ionicons name="location" size={18} color={Colors.dark.secondary} />
          <Text style={styles.permText}>Location access is needed</Text>
          {Platform.OS !== "web" && (
            <Pressable
              onPress={async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === "granted") setLocationGranted(true);
              }}
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
                <Text style={styles.tetherVal}>{tetherDistance} ft</Text>
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
                    <View style={[styles.mlDot, { backgroundColor: isSep ? Colors.dark.danger : getMemberColor(idx) }]} />
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
              <Ionicons name={host ? "stop-circle" : "exit"} size={18} color={Colors.dark.danger} />
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
            <Text style={styles.miniTether}>{tetherDistance}ft</Text>
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
  loadingText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.dark.textSecondary,
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
    backgroundColor: "rgba(10, 14, 23, 0.88)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
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
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.3)",
    zIndex: 10,
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
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.dark.danger,
  },
  alertTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: "rgba(255, 71, 87, 0.6)",
  },
  permBanner: {
    position: "absolute",
    top: "45%",
    left: 20,
    right: 20,
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  permText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    flex: 1,
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
    backgroundColor: "rgba(10, 14, 23, 0.94)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.dark.cardBorder,
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
  tetherVal: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.dark.primary,
  },
  membersList: {
    paddingHorizontal: 16,
    gap: 6,
  },
  mlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mlDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
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
    borderRadius: 12,
    backgroundColor: Colors.dark.dangerDim,
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
    gap: 6,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  pinLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 10,
    color: Colors.dark.text,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
