# Industrial Evidence Chain - Frontend

A React-based frontend for the Industrial Evidence Chain platform - a blockchain-based industrial evidence and audit management system.

## Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS 4
- **Routing**: React Router 7
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **QR Scanning**: html5-qrcode
- **Camera Access**: Native Browser APIs (getUserMedia, MediaRecorder)

## Project Structure

```
src/
├── app/                    # Application core
│   ├── App.tsx            # Main app component
│   ├── routes.tsx         # Router configuration
│   └── providers.tsx      # Context providers
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (Button, Input, Card, Modal, etc.)
│   ├── layout/           # Layout components (Sidebar, Header, MobileNav)
│   ├── auth/             # Authentication components
│   ├── assets/           # Asset-related components
│   ├── evidence/         # Evidence capture components
│   ├── camera/           # Camera capture components
│   ├── qr/               # QR scanner components
│   ├── verification/     # Verification display components
│   └── dashboard/        # Dashboard widgets
├── pages/                # Page components
│   ├── auth/             # Login page
│   ├── dashboard/        # Dashboard page
│   ├── assets/           # Asset management pages
│   ├── evidence/         # Evidence capture & details pages
│   ├── verification/     # Verification page
│   ├── audit/            # Audit dashboard
│   └── system/           # Error pages (404, Unauthorized)
├── services/             # API service layer
│   ├── api/              # Central API client
│   ├── auth/             # Authentication service
│   ├── assets/           # Asset service
│   ├── evidence/         # Evidence service
│   └── verification/     # Verification service
├── hooks/                # Custom React hooks
│   ├── useAuth.ts
│   ├── useCamera.ts
│   ├── useGeolocation.ts
│   └── useMediaCapture.ts
├── context/              # React context providers
│   ├── AuthContext.tsx
│   └── AppContext.tsx
├── types/                # TypeScript type definitions
│   ├── api.ts
│   ├── auth.ts
│   ├── asset.ts
│   ├── evidence.ts
│   └── verification.ts
├── constants/            # Application constants
│   ├── routes.ts
│   ├── roles.ts
│   ├── evidenceStatus.ts
│   └── activityTypes.ts
├── mocks/                # Mock data for development
│   ├── apiResponses.ts
│   ├── authService.ts
│   ├── assetService.ts
│   ├── evidenceService.ts
│   └── verificationService.ts
├── utils/                # Utility functions
│   ├── date.ts
│   ├── format.ts
│   └── validation.ts
└── styles/               # Global styles
    ├── globals.css
    ├── tokens.css
    └── animations.css
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api

# Mock Mode - Set to 'true' to use mock data instead of real API
VITE_USE_MOCK_API=true

# Application Configuration
VITE_APP_NAME=Industrial Evidence Chain
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_QR_SCANNER=true
VITE_ENABLE_CAMERA_CAPTURE=true
VITE_ENABLE_GEOLOCATION=true
```

## Mock Mode

The application supports a mock mode for development without a backend:

- Set `VITE_USE_MOCK_API=true` in your `.env` file
- Mock services are automatically used for all API calls
- Mock data includes users, assets, evidence, and verification results
- No backend server required for frontend development

## User Roles

The application supports four roles with different permissions:

| Role | Permissions |
|------|-------------|
| **Technician** | View assets, capture evidence, scan QR codes |
| **Manager** | All Technician permissions + manage assets, approve evidence, generate QR codes |
| **Auditor** | View assets, verify evidence, access audit logs, export reports |
| **Admin** | Full system access including user management and system configuration |

## Core User Flows

### 1. Login Flow
1. User enters credentials on `/login`
2. Receives JWT token and user info from Member 1 API
3. Session stored in localStorage
4. Redirected to role-aware dashboard

### 2. Asset Identification
1. Dashboard → Scan Asset QR OR Search Asset
2. Load Asset Details from API
3. Confirm Asset → Start Evidence Capture

### 3. Evidence Capture (Critical)
- **Live capture only** - no gallery uploads
- Photo capture via device camera
- Video recording via device camera
- Works on desktop webcam, laptop, mobile camera
- GPS/location capture where supported
- Preview captured media before submit

### 4. Evidence Lifecycle Statuses
Draft → Uploading → Submitted → Processing → Pending Anchor → Anchored → Verification Pending → Verified / Integrity Mismatch / Failed

### 5. Verification Flow
1. Frontend requests verification from backend
2. Backend communicates with Member 2's evidence engine
3. Result displayed as VERIFIED or INTEGRITY MISMATCH
4. Frontend never makes independent trust decisions

## API Integration

The frontend integrates with Member 1's ASP.NET Core Web API:

```
Frontend → REST API → ASP.NET Core Backend → PostgreSQL / Evidence Engine → Hyperledger Fabric
```

### Expected API Endpoints

```
POST   /api/auth/login
GET    /api/assets
POST   /api/assets
GET    /api/assets/{id}
GET    /api/assets/{id}/history
POST   /api/evidence
GET    /api/evidence/{id}
POST   /api/evidence/{id}/upload
POST   /api/evidence/{id}/anchor
POST   /api/evidence/{id}/verify
```

## Member 2 Integration

Member 2's blockchain verification results reach the UI through Member 1's API:

1. Frontend calls `/api/evidence/{id}/verify`
2. Backend invokes Member 2's verification engine
3. Member 2 returns verification result with blockchain proof
4. Frontend displays result via VerificationResult component

**Frontend never directly communicates with Hyperledger Fabric or handles cryptographic operations.**

## Design Principles

- Apple-inspired minimalism + Industrial precision
- Spacious layouts with strong typography hierarchy
- Security and trust visualization
- Responsive design for all device types
- Subtle, smooth animations (respects prefers-reduced-motion)
- No glassmorphism overuse, no generic admin dashboard look

## Development Notes

### What's Implemented
- Complete project foundation and architecture
- All directory structure and base components
- Routing with protected routes and role-based access
- API service layer with mock mode support
- Camera capture (photo/video) using native browser APIs
- QR scanner using html5-qrcode
- Evidence capture flow with multi-step wizard
- TypeScript types for all shared contracts
- Mock data for development

### Intentionally NOT Implemented (Future Work)
- Full visual UI design (Apple-inspired design system)
- Complete backend API integration (awaiting Member 1)
- Real blockchain verification (awaiting Member 2)
- Advanced features: notifications, real-time updates, offline support
- Comprehensive test suite
- Internationalization (i18n)
- PWA features
- Advanced reporting/analytics

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment to any static hosting service.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires support for:
- MediaDevices API (getUserMedia)
- MediaRecorder API
- Web Crypto API (for future use)