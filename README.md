# Friend-Zone

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0-000020.svg)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg)](https://expressjs.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

> **Finally, a FriendZone you actually *want* to be in.**

A real-time group safety application that keeps friends connected and safe while walking together through innovative GPS tethering technology.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Inspiration](#inspiration)
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Development](#development)
- [Project Structure](#project-structure)
- [WebSocket Protocol](#websocket-protocol)
- [Deployment](#deployment)
- [Challenges & Solutions](#challenges--solutions)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)

---

## 🎯 Overview

**Friend-Zone** is a real-time, peer-to-peer safety tether application that connects a group of phones together using GPS location sharing and WebSocket technology. The app ensures that no one in a group gets lost or separated by continuously monitoring the distance between all members and triggering alerts when someone strays too far from the group.

Built with modern cross-platform technologies, Friend-Zone provides a native mobile experience on both iOS and Android while maintaining real-time synchronization through a lightweight Express backend server.

---

## 💡 Inspiration

It's 2:00 AM in downtown Athens. The bars are closing, the sidewalks are crowded, and chaos begins. You started the night as a squad of five, but now? One friend stopped mid-walk to daydream, another got distracted by a girl, and suddenly, someone is lost.

Research on campus safety consistently shows that individuals walking alone are significantly more vulnerable to danger than groups, and many people agree they feel safer when with their respective group. To solve this safety issue, we built a tool that creates a buddy system. We want to ensure that **no one is lost**.

---

## ✨ Features

### Core Functionality

- **🔴 Real-time GPS Tracking**: Continuous location monitoring of all group members
- **📍 Dynamic Tether System**: Adjustable safety radius that moves with the group's center
- **🚨 Instant Alerts**: Synchronized notifications across all devices when someone drifts away
- **📱 Cross-Platform**: Works on iOS, Android, and web browsers
- **🔐 Session-Based Privacy**: No permanent data storage - sessions are ephemeral
- **📲 Easy Setup**: Join via QR code or simple 5-character code

### User Experience

- **🎨 Modern Dark UI**: Sleek interface with gradient effects and smooth animations
- **📳 Haptic Feedback**: Tactile responses to user actions
- **🗺️ Interactive Map**: Real-time visualization of all group members
- **👥 Member List**: See all participants and their last known locations
- **⚙️ Host Controls**: Session creator can adjust tether distance in real-time
- **⏱️ Activity Timestamps**: Know when each member's location was last updated

---

## 🔄 How It Works

### Setup Phase

1. **Create Session**: One person hosts a "tether" session on the app
2. **Share Code**: Host displays a QR code or 5-character code
3. **Join Group**: Other members scan the QR code or enter the code to join
4. **Grant Permissions**: Each user grants location access to their device

### Active Tethering

1. **Location Sharing**: The app continuously sends GPS coordinates via WebSocket to the server
2. **Centroid Calculation**: Server calculates the group's center point based on all member locations
3. **Distance Monitoring**: For each member, the app calculates their distance from the center
4. **Dynamic Radius**: The tether circle always stays centered on the group as they move together

### Alert System

- **Threshold Detection**: When any user drifts outside the tether distance radius
- **Synchronized Alerts**: All group members' phones simultaneously trigger a "Red Alert"
- **Multi-Sensory Feedback**: Visual alerts, haptic vibration, and notifications
- **Real-time Updates**: Alerts clear automatically when the member returns within range

---

## ��️ Architecture

### High-Level Architecture

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   Client    │◄──────────────────────────►│    Server    │
│  (Mobile)   │      JSON Messages         │  (Express)   │
└─────────────┘                             └──────────────┘
      │                                            │
      │ GPS Updates (continuous)                   │
      ▼                                            ▼
┌─────────────┐                          ┌──────────────┐
│expo-location│                          │  In-Memory   │
│   Service   │                          │   Sessions   │
└─────────────┘                          └──────────────┘
```

### Frontend Architecture (React Native / Expo)

**Framework**: Expo SDK 54 with expo-router for file-based routing

**Main Screens** (\`app/\` directory):
- \`index.tsx\` - Home screen with name input and create/join options
- \`create.tsx\` - Host creates a walk session, displays QR code with session code
- \`join.tsx\` - Join an existing session by entering a 5-character code
- \`walk.tsx\` - Active walk monitoring screen with live map, member locations, and tether controls

**Key Components** (\`components/\` directory):
- \`MapViewWrapper.tsx\` - Cross-platform map component (native maps or web fallback)
- \`TetherSlider.tsx\` - Custom slider for adjusting tether distance
- \`ErrorBoundary.tsx\` - Error handling and recovery
- \`KeyboardAwareScrollViewCompat.tsx\` - Platform-specific keyboard handling

**Utilities** (\`lib/\` directory):
- \`websocket.ts\` - WebSocket connection management and message types
- \`location-utils.ts\` - GPS calculations including Haversine formula implementation
- \`query-client.ts\` - React Query configuration
- \`react-native-maps-web-shim.js\` - Web fallback for native map components

### Backend Architecture (Node.js / Express)

**Server** (\`server/\` directory):
- \`index.ts\` - Main Express server setup with CORS, body parsing, and routing
- \`routes.ts\` - WebSocket server and session management logic
- \`storage.ts\` - In-memory storage interface (prepared for future database integration)

**Session Management**:
- In-memory \`Map<string, WalkSession>\` stores active walk sessions
- Each session contains:
  - 5-character alphanumeric code (e.g., "AB3K7")
  - Host name and member list with WebSocket connections
  - Tether distance setting (default: 50 feet)
  - Active status flag

**Real-time Communication**:
- WebSocket server using \`ws\` library attached to HTTP server
- Bidirectional JSON message protocol
- Broadcast system for location updates to all session members

---

## 🛠️ Technology Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React Native 0.81.5** | Cross-platform mobile framework |
| **Expo SDK 54** | Development platform and native modules |
| **expo-router 6.0** | File-based navigation system |
| **React Query 5.83** | Server state management |
| **TypeScript 5.9** | Type-safe development |
| **react-native-maps** | Native map integration (iOS/Android) |
| **expo-location** | GPS location services |
| **expo-haptics** | Tactile feedback |
| **react-native-qrcode-svg** | QR code generation |
| **expo-linear-gradient** | Gradient visual effects |
| **react-native-reanimated** | Smooth animations |

### Backend

| Technology | Purpose |
|-----------|---------|
| **Node.js** | JavaScript runtime |
| **Express 5** | Web server framework |
| **ws (WebSocket)** | Real-time bidirectional communication |
| **TypeScript** | Type safety |
| **tsx** | TypeScript execution for development |
| **esbuild** | Fast production bundling |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Babel** | JavaScript transpilation |
| **Metro** | React Native bundler |
| **patch-package** | Dependency patching |
| **Drizzle ORM** | Database schema management (prepared for future use) |

### Mathematical Implementation

**Haversine Formula** for calculating distances between GPS coordinates:

\`\`\`typescript
function distanceInFeet(lat1, lon1, lat2, lon2) {
  const R = 20902231; // Earth's radius in feet
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
\`\`\`

This accounts for the Earth's curvature, providing accurate distance calculations even over longer distances.

---

## 📦 Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Expo CLI**: \`npm install -g expo-cli\`
- **iOS Simulator** (macOS) or **Android Studio** (for emulator)
- **Expo Go** app on your mobile device (for testing)

### Clone the Repository

\`\`\`bash
git clone https://github.com/nirajktr/Friend-Zone.git
cd Friend-Zone
\`\`\`

### Install Dependencies

\`\`\`bash
npm install
\`\`\`

### Environment Setup

The app is configured to work with Replit environment variables by default. For local development, you can run without additional configuration, but for production deployment, you may want to set:

\`\`\`bash
# Optional: Set custom domain (Replit sets these automatically)
export REPLIT_DEV_DOMAIN=your-domain.repl.co
export PORT=5000
\`\`\`

---

## 🚀 Development

### Start Development Servers

You need to run both the Expo development server and the Express backend:

#### Terminal 1: Start Expo Dev Server

\`\`\`bash
npm run expo:dev
\`\`\`

This starts the Expo development server with proper environment configuration for Replit or local development.

#### Terminal 2: Start Express Backend

\`\`\`bash
npm run server:dev
\`\`\`

This starts the Express server with WebSocket support on port 5000 (or the configured PORT).

### Testing on Devices

#### iOS Simulator (macOS only)

Press \`i\` in the Expo dev server terminal or:

\`\`\`bash
npm run expo:dev
# Then press 'i'
\`\`\`

#### Android Emulator

Press \`a\` in the Expo dev server terminal or:

\`\`\`bash
npm run expo:dev
# Then press 'a'
\`\`\`

#### Physical Device (Recommended)

1. Install **Expo Go** from App Store or Google Play
2. Scan the QR code shown in the terminal
3. App will load on your device with hot reloading

### Code Quality

\`\`\`bash
# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix
\`\`\`

---

## 📁 Project Structure

\`\`\`
Friend-Zone/
├── app/                          # Expo Router screens (file-based routing)
│   ├── index.tsx                 # Home/landing screen
│   ├── create.tsx                # Create walk session screen
│   ├── join.tsx                  # Join session screen
│   ├── walk.tsx                  # Active walk monitoring screen
│   └── _layout.tsx               # Root layout with providers
├── components/                   # Reusable React components
│   ├── MapViewWrapper.tsx        # Cross-platform map component
│   ├── TetherSlider.tsx          # Custom distance slider
│   ├── ErrorBoundary.tsx         # Error boundary wrapper
│   └── KeyboardAwareScrollViewCompat.tsx
├── lib/                          # Utility functions and clients
│   ├── websocket.ts              # WebSocket client logic
│   ├── location-utils.ts         # GPS calculations (Haversine, etc.)
│   ├── query-client.ts           # React Query setup
│   └── react-native-maps-web-shim.js
├── server/                       # Express backend
│   ├── index.ts                  # Server entry point
│   ├── routes.ts                 # WebSocket and API routes
│   ├── storage.ts                # Storage interface
│   └── templates/                # HTML templates for landing page
├── constants/                    # App-wide constants
│   └── colors.ts                 # Color theme definitions
├── assets/                       # Static assets (images, fonts)
├── shared/                       # Shared code between frontend and backend
│   └── schema.ts                 # Database schema (future use)
├── scripts/                      # Build and deployment scripts
├── package.json                  # Dependencies and scripts
├── app.json                      # Expo configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
\`\`\`

---

## 🔌 WebSocket Protocol

### Client → Server Messages

#### Create Session
\`\`\`json
{
  "type": "create",
  "name": "John"
}
\`\`\`

#### Join Session
\`\`\`json
{
  "type": "join",
  "code": "AB3K7",
  "name": "Jane"
}
\`\`\`

#### Location Update
\`\`\`json
{
  "type": "location",
  "latitude": 33.9519,
  "longitude": -83.3576
}
\`\`\`

#### Update Tether Distance (Host only)
\`\`\`json
{
  "type": "tether_distance",
  "distance": 75
}
\`\`\`

#### End Session
\`\`\`json
{
  "type": "end"
}
\`\`\`

### Server → Client Messages

#### Session Created
\`\`\`json
{
  "type": "created",
  "code": "AB3K7"
}
\`\`\`

#### Joined Successfully
\`\`\`json
{
  "type": "joined",
  "code": "AB3K7"
}
\`\`\`

#### Member List Update
\`\`\`json
{
  "type": "members",
  "members": ["John", "Jane", "Mike"]
}
\`\`\`

#### Location Updates
\`\`\`json
{
  "type": "locations",
  "members": [
    {
      "name": "John",
      "latitude": 33.9519,
      "longitude": -83.3576,
      "lastUpdate": 1625097600000
    }
  ]
}
\`\`\`

#### Tether Distance Updated
\`\`\`json
{
  "type": "tether_distance",
  "distance": 75
}
\`\`\`

#### Session Ended
\`\`\`json
{
  "type": "ended"
}
\`\`\`

#### Error
\`\`\`json
{
  "type": "error",
  "message": "Walk not found"
}
\`\`\`

---

## 🚢 Deployment

### Production Build

#### 1. Build Static Expo Web Bundle

\`\`\`bash
npm run expo:static:build
\`\`\`

This creates a static web build in the \`static-build/\` directory.

#### 2. Build Express Server

\`\`\`bash
npm run server:build
\`\`\`

This bundles the server code into \`server_dist/\` using esbuild.

#### 3. Start Production Server

\`\`\`bash
npm run server:prod
\`\`\`

The Express server will serve both:
- The static Expo web app
- WebSocket endpoints for real-time communication

### Environment Variables

For production deployment, configure:

\`\`\`bash
PORT=5000                          # Server port
NODE_ENV=production                # Production mode
REPLIT_DEV_DOMAIN=your-app.repl.co # Your domain (if using Replit)
\`\`\`

### Database Setup (Optional - Future Use)

The project includes Drizzle ORM schema for future database integration:

\`\`\`bash
# Set database URL
export DATABASE_URL=postgresql://user:password@host:5432/database

# Push schema to database
npm run db:push
\`\`\`

Currently, the app uses in-memory storage for walk sessions.

---

## 🎓 Challenges & Solutions

### Challenge 1: React Native Learning Curve

**Problem**: Neither team member had worked on app development before.

**Solution**: Utilized YouTube tutorials, official documentation, and extensive debugging. Learned by doing and iterating quickly.

### Challenge 2: GPS Inconsistency

**Problem**: Indoors, GPS signals often bounce, creating erratic movements that triggered false alarms.

**Solution**: Implemented a signal filter that ignores movements under 2 meters unless sustained for more than 5 seconds. This significantly reduced false positives.

### Challenge 3: Latency Synchronization

**Problem**: Initially, different phones received alerts at different times, breaking the group safety model.

**Solution**: Switched to a WebSocket-based architecture with broadcast messaging, ensuring all devices receive alerts simultaneously.

### Challenge 4: Cross-Platform Compatibility

**Problem**: React Native Maps doesn't work on web, causing crashes.

**Solution**: Created a web shim (\`react-native-maps-web-shim.js\`) that provides fallback components, configured Metro to resolve the correct module per platform.

---

## 🔮 Future Roadmap

### Smart Watch Integration
- Apple Watch and Wear OS apps
- Quick glance at group status
- Haptic alerts on the wrist

### Battery Prediction
- Estimate remaining battery life of group members
- Alert when someone's phone is running low
- Suggest charging stops if needed

### SOLO MODE
- Single-user mode with emergency contacts
- Automatic alerts if user stops moving for too long
- Share live location with trusted contacts

### Additional Features
- 📊 Historical walk data and statistics
- 🌙 Battery optimization for all-night walks
- 🔔 Custom alert sounds and vibration patterns
- 🗺️ Offline maps for areas with poor connectivity
- 👮 Integration with campus safety services
- 📸 Photo sharing within walk sessions
- 💬 In-app chat for group communication

---

## 🤝 Contributing

We welcome contributions! This project was built during a hackathon, and there's always room for improvement.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: \`git checkout -b feature/amazing-feature\`
3. **Commit your changes**: \`git commit -m 'Add some amazing feature'\`
4. **Push to the branch**: \`git push origin feature/amazing-feature\`
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Write descriptive commit messages
- Test on both iOS and Android when possible
- Update documentation for new features
- Keep changes focused and atomic

---

## 👥 Team

Built with ❤️ during UGAHacks hackathon. We learned a lot during this hackathon - from experimenting with different tech stacks to frameworks, we gained valuable experience which we wouldn't get in classes. Whether we win or not, this was an amazing first experience for us and definitely won't be our last. We are proud of this project and it is amazing to see the UGAHacks community come together and grow together.

---

## 📄 License

This project is part of a hackathon submission. Please contact the repository owner for licensing information.

---

## 🙏 Acknowledgments

- UGAHacks for organizing the hackathon
- The React Native and Expo communities for excellent documentation
- All the YouTube tutorials that helped us learn React Native
- Campus safety research that inspired this project

---

**Friend-Zone: Finally, a FriendZone you actually *want* to be in.** 🚶‍♂️🚶‍♀️📱
