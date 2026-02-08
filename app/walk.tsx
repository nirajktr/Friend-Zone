import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
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

  const wsRef = useRef<WebSocket | null>(null);
  const mapRef = useRef<any>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;

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
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            );
            if (Platform.OS === "web") {
              router.replace("/");
            } else {
              Alert.alert("Walk Ended", "The host has ended this walk.", [
                { text: "OK", onPress: () => router.replace("/") },
              ]);
            }
            break;
          case "error":
            break;
        }
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    ws.onerror = () => {};

    return () => {
      ws.close();
    };
  }, [code, name]);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      if (Platform.OS === "web") {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            }
          );
          setLocationGranted(true);
          sendLocation(
            position.coords.latitude,
            position.coords.longitude
          );

          const watchId = navigator.geolocation.watchPosition(
            (pos) => {
              sendLocation(pos.coords.latitude, pos.coords.longitude);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
          );

          return () => navigator.geolocation.clearWatch(watchId);
        } catch {
          setLocationGranted(false);
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationGranted(false);
        return;
      }
      setLocationGranted(true);

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (loc) => {
          sendLocation(loc.coords.latitude, loc.coords.longitude);
        }
      );
      locationSubRef.current = sub;
    })();

    return () => {
      if (sub) sub.remove();
      if (locationSubRef.current) locationSubRef.current.remove();
    };
  }, []);

  const sendLocation = useCallback(
    (latitude: number, longitude: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "location", latitude, longitude })
        );
      }
    },
    []
  );

  useEffect(() => {
    const centroid = calculateCentroid(members);
    if (!centroid) {
      setSeparated([]);
      return;
    }

    const sep = members
      .filter((m) => m.latitude !== null && m.longitude !== null)
      .map((m) => {
        const dist = distanceInFeet(
          m.latitude!,
          m.longitude!,
          centroid.latitude,
          centroid.longitude
        );
        return { ...m, distance: dist };
      })
      .filter((m) => m.distance > tetherDistance);

    if (sep.length > 0 && separated.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setSeparated(sep);
  }, [members, tetherDistance]);

  const handleTetherChange = (val: number) => {
    setTetherDistance(val);
    if (host && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "tether_distance", distance: val })
      );
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
  const myLocation = members.find((m) => m.name === name);

  const initialRegion = {
    latitude: myLocation?.latitude ?? 37.9838,
    longitude: myLocation?.longitude ?? 23.7275,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  const currentRegion = myLocation?.latitude
    ? {
        latitude: myLocation.latitude,
        longitude: myLocation.longitude!,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      }
    : undefined;

  return (
    <View style={styles.container}>
      <MapWrapper
        mapRef={mapRef}
        initialRegion={initialRegion}
        region={currentRegion}
      >
        {centroid && (
          <MapCircle
            center={centroid}
            radius={tetherDistance * 0.3048}
            strokeColor="rgba(0, 229, 160, 0.4)"
            fillColor="rgba(0, 229, 160, 0.08)"
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
            const color = getMemberColor(
              memberNames.indexOf(m.name) >= 0
                ? memberNames.indexOf(m.name)
                : idx
            );
            return (
              <MapMarker
                key={m.name}
                coordinate={{
                  latitude: m.latitude!,
                  longitude: m.longitude!,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.memberMarkerOuter}>
                  <View
                    style={[
                      styles.memberMarker,
                      {
                        backgroundColor: isSep
                          ? Colors.dark.danger
                          : color,
                      },
                    ]}
                  >
                    <Ionicons name="person" size={14} color="#FFF" />
                  </View>
                  <Text
                    style={[
                      styles.markerLabel,
                      isSep && { color: Colors.dark.danger },
                    ]}
                  >
                    {m.name}
                  </Text>
                </View>
              </MapMarker>
            );
          })}
      </MapWrapper>

      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + webTopInset + 8 },
        ]}
      >
        <View style={styles.topBarInner}>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    separated.length > 0
                      ? Colors.dark.danger
                      : Colors.dark.primary,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {separated.length > 0
                ? `${separated.length} separated`
                : "All safe"}
            </Text>
          </View>

          <View style={styles.memberCountPill}>
            <Feather name="users" size={14} color={Colors.dark.text} />
            <Text style={styles.memberCountText}>{memberNames.length}</Text>
          </View>
        </View>

        {code && (
          <View style={styles.codePill}>
            <Text style={styles.codePillText}>{code}</Text>
          </View>
        )}
      </View>

      {separated.length > 0 && (
        <RNAnimated.View
          style={[
            styles.alertBanner,
            {
              top: insets.top + webTopInset + 70,
              backgroundColor: alertBgColor,
            },
          ]}
        >
          <Ionicons name="warning" size={20} color={Colors.dark.danger} />
          <View style={styles.alertContent}>
            {separated.map((s) => (
              <View key={s.name} style={styles.alertRow}>
                <Text style={styles.alertName}>{s.name}</Text>
                <Text style={styles.alertDistance}>
                  {Math.round(s.distance)} ft away
                </Text>
                <Text style={styles.alertTime}>
                  {timeAgo(s.lastUpdate)}
                </Text>
              </View>
            ))}
          </View>
        </RNAnimated.View>
      )}

      {!locationGranted && (
        <View style={styles.permissionBanner}>
          <Ionicons name="location" size={20} color={Colors.dark.secondary} />
          <Text style={styles.permissionText}>
            Location access needed to track your position
          </Text>
          <Pressable
            onPress={async () => {
              if (Platform.OS !== "web") {
                const { status } =
                  await Location.requestForegroundPermissionsAsync();
                if (status === "granted") setLocationGranted(true);
              }
            }}
          >
            <Text style={styles.permissionButton}>Grant</Text>
          </Pressable>
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
          style={styles.controlsToggle}
        >
          <View style={styles.grabber} />
        </Pressable>

        {showControls && (
          <View style={styles.controlsContent}>
            {host && (
              <TetherSlider
                value={tetherDistance}
                onValueChange={handleTetherChange}
              />
            )}

            {!host && (
              <View style={styles.tetherInfo}>
                <Text style={styles.tetherInfoLabel}>Tether Distance</Text>
                <Text style={styles.tetherInfoValue}>{tetherDistance} ft</Text>
              </View>
            )}

            <View style={styles.memberList}>
              <Text style={styles.memberListTitle}>Group Members</Text>
              {memberNames.map((memberName, idx) => {
                const loc = members.find((m) => m.name === memberName);
                const isSep = separated.some((s) => s.name === memberName);
                const dist =
                  centroid && loc?.latitude != null && loc?.longitude != null
                    ? distanceInFeet(
                        loc.latitude,
                        loc.longitude,
                        centroid.latitude,
                        centroid.longitude
                      )
                    : null;
                return (
                  <View key={memberName} style={styles.memberListRow}>
                    <View
                      style={[
                        styles.memberListDot,
                        {
                          backgroundColor: isSep
                            ? Colors.dark.danger
                            : getMemberColor(idx),
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.memberListName,
                        isSep && { color: Colors.dark.danger },
                      ]}
                    >
                      {memberName}
                    </Text>
                    {dist != null && (
                      <Text
                        style={[
                          styles.memberListDist,
                          isSep && { color: Colors.dark.danger },
                        ]}
                      >
                        {Math.round(dist)} ft
                      </Text>
                    )}
                    {loc?.lastUpdate && (
                      <Text style={styles.memberListTime}>
                        {timeAgo(loc.lastUpdate)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.actionRow}>
              {host ? (
                <Pressable
                  onPress={handleEndWalk}
                  style={({ pressed }) => [
                    styles.endButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons
                    name="stop-circle"
                    size={20}
                    color={Colors.dark.danger}
                  />
                  <Text style={styles.endButtonText}>End Walk</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleLeave}
                  style={({ pressed }) => [
                    styles.endButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons
                    name="exit"
                    size={20}
                    color={Colors.dark.danger}
                  />
                  <Text style={styles.endButtonText}>Leave Walk</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {!showControls && (
          <View style={styles.miniControls}>
            <View style={styles.miniRow}>
              <View style={styles.miniStatusRow}>
                <View
                  style={[
                    styles.miniDot,
                    {
                      backgroundColor:
                        separated.length > 0
                          ? Colors.dark.danger
                          : Colors.dark.primary,
                    },
                  ]}
                />
                <Text style={styles.miniText}>
                  {separated.length > 0
                    ? `${separated.length} separated`
                    : "All safe"}
                </Text>
              </View>
              <Text style={styles.miniTether}>{tetherDistance}ft tether</Text>
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
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  topBarInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 14, 23, 0.85)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.text,
  },
  memberCountPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 14, 23, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  memberCountText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.text,
  },
  codePill: {
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: "rgba(10, 14, 23, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  codePillText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.primary,
    letterSpacing: 2,
  },
  alertBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.3)",
    zIndex: 10,
  },
  alertContent: {
    flex: 1,
    gap: 6,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.dark.danger,
    flex: 1,
  },
  alertDistance: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.danger,
  },
  alertTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: "rgba(255, 71, 87, 0.7)",
  },
  permissionBanner: {
    position: "absolute",
    top: "50%",
    left: 24,
    right: 24,
    transform: [{ translateY: -30 }],
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 10,
  },
  permissionText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  permissionButton: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.primary,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 14, 23, 0.92)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.dark.cardBorder,
  },
  controlsToggle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textMuted,
  },
  controlsContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 12,
  },
  tetherInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tetherInfoLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  tetherInfoValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.dark.primary,
  },
  memberList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  memberListTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  memberListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberListDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberListName: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.dark.text,
    flex: 1,
  },
  memberListDist: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  memberListTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  actionRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.dangerDim,
    gap: 8,
  },
  endButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.dark.danger,
  },
  miniControls: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  miniRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.text,
  },
  miniTether: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  centroidMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 229, 160, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  centroidDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.primary,
  },
  memberMarkerOuter: {
    alignItems: "center",
    gap: 2,
  },
  memberMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  markerLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.dark.text,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
