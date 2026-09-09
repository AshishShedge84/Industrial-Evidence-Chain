# Industrial Evidence Chain (IEC) — Mobile Application Development (`APP DEV`)

This directory houses the mobile application clients for the Industrial Evidence Chain ecosystem.

```
APP DEV/
├── Android/         # ACTIVE: Primary mobile development target
│   └── ARCHITECTURE.md # Architecture, tech stack analysis, design system reuse, and roadmap
└── IOS/             # FUTURE: Placeholder for subsequent iOS phase
    └── README.md
```

## Guiding Principles
1. **Safety & Zero Disruption**: The existing Web Frontend (`frontend/`), Backend API (`backend/`), and Blockchain Adapter (`blockchain/`) remain strictly undisturbed.
2. **Visual & Brand Identity Parity**: The mobile apps preserve the exact color tokens, dark/light themes, glassmorphism principles, Memoji avatar expressions, and role-based experiences of the IEC web platform.
3. **True Mobile UX**: Desktop layouts (e.g. sidebars, multi-column tables) are reimagined into mobile-first patterns (bottom navigation, swipeable cards, full-screen camera/QR viewfinders, modal sheets).
4. **Unified API Contract**: Mobile applications connect to the exact same Backend API endpoints (`/api/*`), maintaining centralized business logic and ledger immutability.
