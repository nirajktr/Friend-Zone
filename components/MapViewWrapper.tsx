import React from "react";
import { Platform, View, StyleSheet, Text } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import Colors from "@/constants/colors";

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapProps {
  mapRef?: React.RefObject<any>;
  initialRegion: MapRegion;
  region?: MapRegion;
  children?: React.ReactNode;
}

export function MapWrapper({ mapRef, initialRegion, region, children }: MapProps) {
  if (Platform.OS === "web") {
    return (
      <View style={webStyles.container}>
        <View style={webStyles.grid}>
          {Array.from({ length: 40 }).map((_, i) => (
            <View key={i} style={webStyles.gridLine} />
          ))}
        </View>
        <View style={webStyles.center}>
          <View style={webStyles.iconCircle}>
            <Text style={webStyles.iconText}>MAP</Text>
          </View>
          <Text style={webStyles.text}>Map View</Text>
          <Text style={webStyles.subtext}>
            Open on your phone via Expo Go to see the live map with all member locations
          </Text>
          <Text style={webStyles.coords}>
            {region?.latitude?.toFixed(4) ?? initialRegion.latitude.toFixed(4)},{" "}
            {region?.longitude?.toFixed(4) ?? initialRegion.longitude.toFixed(4)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      region={region}
      showsUserLocation={false}
      showsMyLocationButton={false}
      userInterfaceStyle="dark"
    >
      {children}
    </MapView>
  );
}

export function MapMarker(props: any) {
  if (Platform.OS === "web") return null;
  return <Marker {...props} />;
}

export function MapCircle(props: any) {
  if (Platform.OS === "web") return null;
  return <Circle {...props} />;
}

const webStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0D1520",
    justifyContent: "center",
    alignItems: "center",
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
    opacity: 0.06,
  },
  gridLine: {
    width: "10%",
    height: 60,
    borderWidth: 0.5,
    borderColor: Colors.dark.primary,
  },
  center: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.primaryDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  iconText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.dark.primary,
    letterSpacing: 1,
  },
  text: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textSecondary,
  },
  subtext: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: "center",
  },
  coords: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.dark.primary,
    marginTop: 4,
  },
});
