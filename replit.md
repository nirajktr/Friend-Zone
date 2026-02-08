# Friend-Zone

## Overview

Friend-Zone is a real-time group safety app built with Expo (React Native) and an Express backend. It allows users to create or join "walk sessions" where group members share their live GPS locations via WebSockets. The app features a tether system that alerts the group when someone strays too far, making it ideal for keeping friends safe while walking together at night or in unfamiliar areas.

The app runs as a cross-platform mobile application (iOS/Android via Expo Go, with a web fallback) backed by an Express server that manages walk sessions and relays location data through WebSockets.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with expo-router for file-based routing
- **Screens**: 4 main screens managed via `app/` directory:
  - `index.tsx` - Home screen with name input, create/join options
  - `create.tsx` - Host creates a walk session, displays QR code with session code
  - `join.tsx` - Join an existing session by entering a 5-character code
  - `walk.tsx` - Active walk screen with live map, member locations, tether controls
- **State Management**: React Query (`@tanstack/react-query`) for server state; local React state for UI
- **Styling**: Dark theme throughout (`constants/colors.ts`), using `expo-linear-gradient` for backgrounds, custom Outfit font family
- **Map**: `react-native-maps` on native platforms; a web shim (`lib/react-native-maps-web-shim.js`) renders a placeholder on web since maps aren't supported there. The Metro config in `metro.config.js` handles this resolution.
- **Real-time Communication**: Raw WebSocket connections (`lib/websocket.ts`) connect to the Express server for session management and location sharing
- **Platform Handling**: Web-specific insets and component variants (e.g., `KeyboardAwareScrollViewCompat`, `MapViewWrapper`) handle platform differences gracefully

### Backend (Express + WebSocket)

- **Server**: Express 5 running on Node.js (`server/index.ts`)
- **WebSocket Server**: Uses the `ws` library attached to the HTTP server (`server/routes.ts`)
- **Session Management**: In-memory `Map<string, WalkSession>` stores active walk sessions. Each session has:
  - A 5-character alphanumeric code
  - Host name and member list
  - Tether distance setting
  - Active status
- **Message Protocol**: JSON messages over WebSocket with types: `create`, `join`, `location`, `tether_distance`, `end`, and response types like `created`, `joined`, `members`, `locations`, `ended`, `error`
- **CORS**: Dynamic CORS based on Replit environment variables, also allows localhost origins for development
- **No persistent session storage**: Walk sessions are ephemeral and exist only in server memory

### Database

- **Schema**: Defined in `shared/schema.ts` using Drizzle ORM with PostgreSQL dialect
- **Current tables**: `users` table with `id`, `username`, `password` fields
- **Storage layer**: `server/storage.ts` currently uses `MemStorage` (in-memory Map) rather than the actual database — the Drizzle schema exists but the app doesn't actively use Postgres for walk sessions
- **Drizzle config**: `drizzle.config.ts` expects a `DATABASE_URL` environment variable pointing to PostgreSQL
- **Migration**: Use `npm run db:push` to push schema to the database

### Build & Deployment

- **Development**: Two processes run simultaneously — Expo dev server (`expo:dev`) and Express backend (`server:dev` via tsx)
- **Production build**: `expo:static:build` creates a static web bundle, `server:build` uses esbuild to bundle the server, `server:prod` runs the production server
- **The Express server in production serves the static Expo web build** and handles API/WebSocket connections on the same port

### Key Libraries

- `expo-location` - GPS location tracking
- `expo-haptics` - Tactile feedback on actions
- `react-native-qrcode-svg` - QR code generation for session codes
- `react-native-reanimated` + `react-native-gesture-handler` - Animations and gestures
- `expo-image-picker` - Image selection (available but usage not prominent in visible code)
- `patch-package` - Applies patches to dependencies on install

## External Dependencies

- **PostgreSQL**: Required via `DATABASE_URL` environment variable. Used with Drizzle ORM for user data persistence, though current walk session logic is in-memory only.
- **Replit Environment**: The app relies on Replit-specific env vars (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `REPLIT_INTERNAL_APP_DOMAIN`) for URL resolution, CORS configuration, and deployment domain detection.
- **WebSocket (ws)**: Server-side WebSocket library for real-time bidirectional communication between the Express server and mobile clients.
- **Google Fonts (Outfit)**: Loaded via `@expo-google-fonts/outfit` for consistent typography across platforms.
- **No external auth service**: Authentication schema exists in the database but no auth flow is implemented in the visible code.
- **No external map tile provider configured**: Uses default Apple Maps (iOS) / Google Maps (Android) via `react-native-maps`.