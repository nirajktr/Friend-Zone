import { MemberLocation } from "./websocket";

export function calculateCentroid(
  members: MemberLocation[]
): { latitude: number; longitude: number } | null {
  const validMembers = members.filter(
    (m) => m.latitude !== null && m.longitude !== null
  );
  if (validMembers.length === 0) return null;

  const sumLat = validMembers.reduce((s, m) => s + (m.latitude ?? 0), 0);
  const sumLng = validMembers.reduce((s, m) => s + (m.longitude ?? 0), 0);

  return {
    latitude: sumLat / validMembers.length,
    longitude: sumLng / validMembers.length,
  };
}

export function distanceInFeet(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 20902231;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function getMemberColor(index: number): string {
  const colors = [
    "#00E5A0",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
  ];
  return colors[index % colors.length];
}
