# PartaiApp

Platform Manajemen Organisasi Tingkat Kabupaten — Kabupaten Kepulauan Meranti, Riau.

## Architecture

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4 (mobile-first, dark/light mode)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication (email/password)
- **PWA**: vite-plugin-pwa + Workbox
- **Charts**: Recharts
- **Maps**: Leaflet + OpenStreetMap (Milestone 4)
- **Deployment**: Vercel

## Project Structure

```
partaiapp/
├── public/
│   ├── icons/          # PWA icons (SVG)
│   └── favicon/        # Favicon
├── src/
│   ├── components/     # Reusable UI components
│   │   └── ui/         # Base UI (Skeleton, Modal, etc.)
│   ├── contexts/       # React contexts (Auth)
│   ├── constants/      # Roles, navigation, config
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Dashboard + Auth layouts
│   ├── lib/            # Firebase initialization
│   ├── pages/          # Route pages
│   │   ├── auth/       # Login, Forgot Password
│   │   ├── dashboard/  # Main dashboard
│   │   ├── members/    # (Milestone 2)
│   │   ├── cadres/     # (Milestone 3)
│   │   └── ...         # Future milestones
│   ├── services/       # Firebase services
│   │   └── firebase/   # Auth, Firestore, Analytics
│   ├── types/          # TypeScript types
│   └── utils/          # Permission helpers, masking
├── firestore.rules     # Security rules (default deny)
├── firestore.indexes.json
├── vercel.json
├── .env.example
└── .gitignore
```

## Installation

```bash
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

**IMPORTANT**: Never commit `.env.local` or any file containing secrets.

## Firebase Setup

1. Firestore Security Rules are in `firestore.rules` — deploy with:
   ```bash
   firebase deploy --only firestore:rules
   ```
2. Composite indexes are in `firestore.indexes.json` — deploy with:
   ```bash
   firebase deploy --only firestore:indexes
   ```
3. Enable Authentication in Firebase Console (Email/Password provider)
4. Create initial user via Firebase Console, then set role in `users` collection

## Role System

| Role | Level | Access |
|------|-------|--------|
| super_admin | 100 | Full system access |
| admin_kabupaten | 80 | Kabupaten-wide data |
| admin_kecamatan | 60 | District-scoped data |
| admin_desa | 40 | Village-scoped data |
| kader | 20 | Field data entry |
| viewer | 10 | Read-only |

Roles are stored in Firestore `users` collection, not derived from email.

## Security

- Firestore rules follow **default deny** principle
- No data readable without authentication AND appropriate role
- NIK is masked for non-admin users
- All secrets use environment variables
- `.env*` and credential files are in `.gitignore`

## Vercel Deployment

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy — Vercel auto-detects Vite

## Milestones

- **M1** ✅ Foundation: Auth, Layout, Dashboard, Roles, Firestore Rules
- **M2** 🔲 Member Management: CRUD, Search, Filter, Pagination
- **M3** 🔲 Cadre Management: Activities, Audit, Statistics
- **M4** 🔲 Regional GIS: Leaflet Map, Regional Analytics
- **M5** 🔲 Document OCR: Camera, Scan, Validation
- **M6** 🔲 Google Sheets: Export, Sync
- **M7** 🔲 Gamification: XP, Levels, Badges, Quiz, Leaderboard, Rewards

## Development (Termux)

```bash
pkg install nodejs-lts git
npm install -g firebase-tools
npm install
npm run dev
```

## License

Private — PartaiApp Project
