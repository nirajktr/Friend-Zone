import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

interface Member {
  name: string;
  ws: WebSocket;
  latitude: number | null;
  longitude: number | null;
  lastUpdate: number;
}

interface WalkSession {
  code: string;
  hostName: string;
  members: Map<string, Member>;
  tetherDistance: number;
  active: boolean;
}

const sessions = new Map<string, WalkSession>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function broadcastLocations(session: WalkSession) {
  const members = Array.from(session.members.values()).map((m) => ({
    name: m.name,
    latitude: m.latitude,
    longitude: m.longitude,
    lastUpdate: m.lastUpdate,
  }));

  const msg = JSON.stringify({ type: "locations", members });
  session.members.forEach((member) => {
    if (member.ws.readyState === WebSocket.OPEN) {
      member.ws.send(msg);
    }
  });
}

function broadcastMemberList(session: WalkSession) {
  const members = Array.from(session.members.values()).map((m) => m.name);
  const msg = JSON.stringify({ type: "members", members });
  session.members.forEach((member) => {
    if (member.ws.readyState === WebSocket.OPEN) {
      member.ws.send(msg);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    let currentSession: WalkSession | null = null;
    let currentName: string | null = null;

    ws.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case "create": {
            const code = generateCode();
            const session: WalkSession = {
              code,
              hostName: msg.name,
              members: new Map(),
              tetherDistance: 50,
              active: true,
            };
            session.members.set(msg.name, {
              name: msg.name,
              ws,
              latitude: null,
              longitude: null,
              lastUpdate: Date.now(),
            });
            sessions.set(code, session);
            currentSession = session;
            currentName = msg.name;

            ws.send(JSON.stringify({ type: "created", code }));
            broadcastMemberList(session);
            break;
          }

          case "join": {
            const session = sessions.get(msg.code?.toUpperCase());
            if (!session) {
              ws.send(JSON.stringify({ type: "error", message: "Walk not found" }));
              return;
            }
            if (session.members.has(msg.name)) {
              ws.send(JSON.stringify({ type: "error", message: "Name already taken" }));
              return;
            }
            session.members.set(msg.name, {
              name: msg.name,
              ws,
              latitude: null,
              longitude: null,
              lastUpdate: Date.now(),
            });
            currentSession = session;
            currentName = msg.name;

            ws.send(JSON.stringify({ type: "joined", code: session.code }));
            broadcastMemberList(session);
            broadcastLocations(session);
            break;
          }

          case "location": {
            if (currentSession && currentName) {
              const member = currentSession.members.get(currentName);
              if (member) {
                member.latitude = msg.latitude;
                member.longitude = msg.longitude;
                member.lastUpdate = Date.now();
                broadcastLocations(currentSession);
              }
            }
            break;
          }

          case "tether_distance": {
            if (currentSession && currentName === currentSession.hostName) {
              currentSession.tetherDistance = msg.distance;
              const dmsg = JSON.stringify({ type: "tether_distance", distance: msg.distance });
              currentSession.members.forEach((m) => {
                if (m.ws.readyState === WebSocket.OPEN) {
                  m.ws.send(dmsg);
                }
              });
            }
            break;
          }

          case "end": {
            if (currentSession) {
              const endMsg = JSON.stringify({ type: "ended" });
              currentSession.members.forEach((m) => {
                if (m.ws.readyState === WebSocket.OPEN) {
                  m.ws.send(endMsg);
                }
              });
              sessions.delete(currentSession.code);
              currentSession = null;
              currentName = null;
            }
            break;
          }
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    });

    ws.on("close", () => {
      if (currentSession && currentName) {
        currentSession.members.delete(currentName);
        if (currentSession.members.size === 0) {
          sessions.delete(currentSession.code);
        } else {
          broadcastMemberList(currentSession);
          broadcastLocations(currentSession);
        }
      }
    });
  });

  return httpServer;
}
