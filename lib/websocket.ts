import { getApiUrl } from "./query-client";

export type MemberLocation = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  lastUpdate: number;
};

export type WSMessage =
  | { type: "created"; code: string }
  | { type: "joined"; code: string }
  | { type: "members"; members: string[] }
  | { type: "locations"; members: MemberLocation[] }
  | { type: "tether_distance"; distance: number }
  | { type: "ended" }
  | { type: "error"; message: string };

export function getWsUrl(): string {
  const apiUrl = getApiUrl();
  const url = new URL(apiUrl);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}/ws`;
}

export function createWalkSocket(): WebSocket {
  const wsUrl = getWsUrl();
  return new WebSocket(wsUrl);
}
