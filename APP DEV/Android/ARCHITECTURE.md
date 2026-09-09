# Industrial Evidence Chain (IEC) — Android Architecture & Foundation Document

## 1. Overview & Objective
The IEC Android Mobile Application brings the Industrial Evidence Chain platform to handheld mobile devices, prioritizing field technicians capturing tamper-proof evidence, facility managers approving assets, auditors verifying cryptographic proofs, and administrators overseeing the ecosystem.

This document establishes the architectural foundation, technology stack recommendation, design token reuse strategy, mobile-specific UX transformations, and backend integration protocols.

---

## 2. Technology Stack Evaluation

### Option 1: React Native + Expo (TypeScript) — [RECOMMENDED]
- **React & TypeScript Parity**: 100% synergy with the existing IEC Web Frontend. Uses identical mental models, component lifecycles, and TypeScript interfaces.
- **Direct Logic & Contract Reuse**:
  - Domain types (`auth.ts`, `asset.ts`, `evidence.ts`, `verification.ts`, etc.) can be directly shared.
  - API Client (`apiClient.ts` with Axios interceptors and token refresh) can be reused with negligible changes.
  - Avatar and Memoji resolution logic (`avatarResolver.ts`, `assistantIdentity.ts`) can be lifted directly.
  - Mock DB & services (`mocks/db.ts`) can run offline for seamless offline development.
- **Hardware Integrations**:
  - `expo-camera`: Instant photo and video capture for evidence recording.
  - `expo-barcode-scanner` / `react-native-vision-camera`: Native QR scanning for asset verification.
  - `expo-location`: High-precision GPS coordinates for immutable evidence geostamping.
  - `expo-crypto`: Local hash calculation (SHA-256) of media before uploading to the Evidence Chain.
- **Styling Synergy**: `NativeWind` (Tailwind CSS for React Native) allows direct reuse of IEC color classes (`bg-primary-600`, `text-accent-500`, `glass-panel`, dark mode variants).
- **Future iOS Expansion**: Provides an automatic, zero-friction path to iOS deployment from the exact same codebase when Phase 2 commences.

### Option 2: Pure Native Android (Kotlin + Jetpack Compose)
- **Language**: Kotlin 2.x, Android SDK 34+.
- **Architecture**: Modern Android Architecture (MVVM / MVI + Clean Architecture with Repository Pattern, Kotlin Coroutines, StateFlow, Retrofit2, OkHttp, Coil for images, CameraX for capture).
- **Trade-offs**:
  - Requires completely rewriting all TypeScript interfaces, validation logic, mock databases, and API services into Kotlin data classes and Retrofit interfaces.
  - Doubles maintenance overhead between web and mobile teams.
  - Zero code portability to iOS.

### Architectural Verdict
**React Native + Expo (TypeScript)** is strongly recommended as the primary mobile technology stack for IEC because it maximizes development velocity, ensures 100% data contract synchronization with the web frontend, and supports instantaneous live preview on Android test devices.

---

## 3. Web Frontend Design System & Asset Reuse Strategy

| Web Frontend Asset / Concept | Mobile Equivalent Strategy |
| :--- | :--- |
| **Color Tokens** (`globals.css`) | Reused directly via Tailwind/NativeWind theme configuration (`colors.primary`, `colors.accent`, `colors.neutral`, semantic alerts). |
| **Typography** | Mapped to mobile scale: `display` (28-32sp), `h1` (24sp), `h2` (20sp), `body` (16sp), `caption` (12sp). |
| **Glassmorphism** (`.glass-panel`) | Implemented via `react-native-blur` / `expo-blur` with translucent dark/light surfaces (`rgba(23,23,23,0.7)` / `rgba(255,255,255,0.8)`). |
| **Memoji Assets** (`/memojis/`) | Assets copied into `assets/memojis/` and resolved using `avatarResolver.ts` logic. |
| **Theme System** | Dual Dark and Light mode powered by React Native `useColorScheme` and NativeWind `dark:` classes. |
| **Icons** | `lucide-react-native` (direct 1:1 match with web `lucide-react`). |

---

## 4. Mobile UX Transformations (Web vs. Mobile)

| Web Frontend Pattern | Android Mobile Redesign Pattern |
| :--- | :--- |
| **Desktop Collapsible Sidebar** | Persistent **Bottom Navigation Bar** for 4 primary tabs + Safe Area Header with Role Memoji & Notifications. |
| **Multi-Column Dashboard Grids** | Single-column vertically scrolling layout with **KPI Summary Cards** and pull-to-refresh (`RefreshControl`). |
| **Wide Data Tables** (Evidence/Asset Lists) | **Card-based List Items** with status badges, thumbnail previews, and swipe-to-act gestures. |
| **Desktop QR Scanner Overlay** | Fullscreen **CameraX / VisionCamera Viewfinder** with haptic feedback on scan and auto-focus target box. |
| **Desktop Floating Chatbot Window** | Dedicated **Assistant Screen / Bottom Sheet Modal** with full-screen conversation view and suggestion chips. |
| **Desktop Notification Center Popover** | Dedicated **Notification Screen or Slide-over Drawer** with filter tabs (`All`, `Unread`). |

---

## 5. Backend & Network Compatibility Rules

- **Base URL Protocol**:
  - On Web: `http://localhost:5000/api`
  - On Android Emulator: `http://10.0.2.2:5000/api` (Android emulator loopback IP to host machine)
  - On Physical Android Device: `http://<DEV_MACHINE_LAN_IP>:5000/api` (configurable via `.env`)
- **API Contracts**: Zero changes to backend routes or schemas (`/api/auth/*`, `/api/evidence/*`, `/api/assets/*`, `/api/verification/*`, `/api/notifications/*`).
- **No Direct Fabric Connection**: The mobile app communicates exclusively with the Backend API. Fabric Blockchain interactions remain safely encapsulated behind the Backend & Blockchain Adapter.

---

## 6. Proposed Android Project Structure (React Native + Expo)

```
APP DEV/Android/
├── App.tsx                    # Application entry point & root providers
├── app.json                   # Expo application manifest & Android package settings
├── package.json               # Mobile dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # NativeWind design token mappings (matches web globals.css)
├── assets/
│   ├── memojis/               # Role-based Memoji assets (Admin, Manager, Auditor, Technician)
│   ├── icons/                 # App launcher icons and splash screens
│   └── fonts/                 # SF Pro / Inter typography assets
├── src/
│   ├── api/                   # Axios client configured for Android loopback / LAN
│   ├── components/
│   │   ├── common/            # Button, Card, Badge, Input, GlassPanel, Avatar
│   │   ├── evidence/          # Mobile Evidence Card, Evidence Timeline, Hash Badge
│   │   ├── camera/            # Native Camera capture & preview overlay
│   │   ├── qr/                # Fullscreen QR Code scanner with targeting overlay
│   │   ├── assistant/         # Mobile Chatbot screen, Header avatar, Floating Trigger
│   │   └── navigation/        # Bottom Tab Bar, Top Safe Header, Drawer
│   ├── constants/             # Activity types, Evidence statuses, Role configs
│   ├── context/               # AuthContext, ThemeContext, AssistantContext
│   ├── hooks/                 # useAuth, useTheme, useCamera, useEvidence, useToast
│   ├── navigation/            # React Navigation (Native Stack + Bottom Tabs)
│   ├── screens/
│   │   ├── auth/              # LoginScreen, RegisterScreen
│   │   ├── dashboard/         # Role-based mobile dashboards (Technician, Manager, Auditor, Admin)
│   │   ├── evidence/          # CaptureEvidenceScreen, EvidenceListScreen, EvidenceDetailScreen
│   │   ├── assets/            # AssetListScreen, AssetDetailScreen, QRScanScreen
│   │   ├── verification/      # VerificationScreen, BlockchainProofScreen
│   │   ├── assistant/         # ChatbotScreen (Full screen mobile assistant)
│   │   ├── notifications/     # NotificationsScreen
│   │   └── profile/           # ProfileScreen (Memoji expression picker & settings)
│   ├── services/              # API services (auth, evidence, asset, verification)
│   ├── types/                 # Shared TypeScript models (mirrored from web frontend)
│   └── utils/                 # avatarResolver.ts, cryptoUtils.ts, formatters.ts
```

---

## 7. Required Android Development Environment & SDKs

1. **Runtime & Tooling**:
   - Node.js LTS (v20+) & npm / yarn
   - Android Studio (Jellyfish / Koala or newer)
   - Android SDK Platform 34 (Android 14) / Platform 33 (Android 13)
   - Android SDK Build-Tools 34.0.0
   - Android Virtual Device (AVD) emulator (e.g. Pixel 7 / 8 running API 34)
   - Java Development Kit (JDK 17)
2. **Mobile Core Dependencies**:
   - `react-native`: ~0.76+
   - `expo`: ~52+
   - `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`
   - `nativewind`: ^4.x + `tailwindcss`: ^3.4.x (React Native bridge)
   - `expo-camera`: Camera capture
   - `expo-barcode-scanner` / `react-native-vision-camera`: Barcode / QR capture
   - `expo-crypto`: SHA-256 local evidence hashing
   - `expo-location`: Evidence geolocation metadata
   - `lucide-react-native`: Unified SVG icons
   - `axios`: Shared HTTP networking
