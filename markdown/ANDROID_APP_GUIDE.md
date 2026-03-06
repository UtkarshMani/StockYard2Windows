# StockYard — Android App Development Guide

> Converting the StockYard inventory management system into an Android application.

This document covers two approaches:
- **Option A: Capacitor** — Wrap the existing Next.js web app in a native Android shell (1–2 days)
- **Option B: React Native** — Rewrite the frontend as a fully native Android app (2–4 weeks)

Both options use the **same backend API** — no server-side changes needed.

---

## Your Architecture

```
                    OFFICE (Ubuntu Server Laptop)
                    ┌──────────────────────────────┐
                    │  Ubuntu Server Laptop          │
                    │                                │
                    │  Backend (Express + Prisma)    │
                    │  Database (SQLite/PostgreSQL)  │
                    │  Frontend (Next.js via Nginx)  │
                    │  PM2 process manager           │
                    │                                │
                    │  Cloudflare Tunnel (cloudflared)│
                    │  ↕ Encrypted tunnel            │
                    └───────────┬──────────────────┘
                                │
                    ┌───────────▼──────────────────┐
                    │       Cloudflare Edge         │
                    │  api.primeinfraa.com           │
                    │  app.primeinfraa.com           │
                    │  Free SSL + DDoS Protection    │
                    └───────────┬──────────────────┘
                                │ Internet (HTTPS)
                ┌───────────────┼───────────────────┐
                │               │                   │
    ┌───────────▼──┐  ┌────────▼───────┐  ┌───────▼────────┐
    │ Office PCs    │  │ Remote Laptops  │  │ Mobile Phones   │
    │ Windows/Linux │  │ Windows/Mac     │  │ Android (this   │
    │ (Desktop App) │  │ (Desktop App)   │  │  guide)         │
    └──────────────┘  └────────────────┘  └────────────────┘
```

**Key point:** The backend and database live on a single Ubuntu Server laptop in your office. A **Cloudflare Tunnel** exposes it securely to the internet (no port forwarding, no static IP needed). All clients — desktop apps on Windows/Linux/Mac, web browsers, and Android apps — connect to the same backend via `https://api.primeinfraa.com`.

> See `OFFICE_SERVER_SETUP.md` for full server setup instructions including Cloudflare Tunnel configuration.

---

## Table of Contents

### Option A: Capacitor
1. [What Is Capacitor?](#1-what-is-capacitor)
2. [Architecture](#2-architecture-capacitor)
3. [Prerequisites](#3-prerequisites)
4. [Project Setup](#4-project-setup)
5. [Configure Next.js for Static Export](#5-configure-nextjs-for-static-export)
6. [Alternative: Live Server Mode (Recommended)](#6-alternative-live-server-mode-recommended)
7. [Add Native Plugins](#7-add-native-plugins)
8. [Theming & Splash Screen](#8-theming--splash-screen)
9. [Build the APK](#9-build-the-apk)
10. [Testing](#10-testing)
11. [Publish to Play Store](#11-publish-to-play-store)
12. [Updating the App](#12-updating-the-app)
13. [Capacitor Pros & Cons](#13-capacitor-pros--cons)

### Option B: React Native
14. [What Is React Native?](#14-what-is-react-native)
15. [Architecture](#15-architecture-react-native)
16. [Prerequisites](#16-prerequisites-1)
17. [Project Setup](#17-project-setup-1)
18. [Project Structure](#18-project-structure)
19. [Reusable Code from Current App](#19-reusable-code-from-current-app)
20. [Screen-by-Screen Implementation](#20-screen-by-screen-implementation)
21. [Navigation Setup](#21-navigation-setup)
22. [API Layer](#22-api-layer)
23. [Authentication](#23-authentication)
24. [Barcode Scanning](#24-barcode-scanning)
25. [PDF Generation](#25-pdf-generation)
26. [Charts & Analytics](#26-charts--analytics)
27. [Push Notifications](#27-push-notifications)
28. [Offline Support](#28-offline-support)
29. [Build the APK](#29-build-the-apk)
30. [Publish to Play Store](#30-publish-to-play-store-1)
31. [React Native Pros & Cons](#31-react-native-pros--cons)

### Comparison
32. [Side-by-Side Comparison](#32-side-by-side-comparison)
33. [Which One Should You Choose?](#33-which-one-should-you-choose)

---

# Option A: Capacitor (Wrap Existing Web App)

## 1. What Is Capacitor?

Capacitor (by the Ionic team) wraps your web app inside a native Android WebView. Think of it as **Electron for mobile** — same concept, different platform.

Your existing Next.js frontend runs inside the Android app, and it talks to the same backend API. Users get a real app on their phone with a home screen icon, push notifications, and native camera access.

```
┌─────────────────────────────────┐
│        Android Phone             │
│                                  │
│  ┌───────────────────────────┐  │
│  │     Capacitor Shell        │  │
│  │     (Native Java/Kotlin)   │  │
│  │                             │  │
│  │  ┌───────────────────────┐ │  │
│  │  │    WebView              │ │  │
│  │  │                         │ │  │
│  │  │  Your Next.js App       │ │  │
│  │  │  (HTML/CSS/JS)          │ │  │
│  │  │                         │ │  │
│  │  │  Same UI as browser     │ │  │
│  │  │  Same code, zero changes│ │  │
│  │  └────────────┬────────────┘ │  │
│  │               │               │  │
│  │    Native Bridge (Plugins)    │  │
│  │    • Camera   • GPS           │  │
│  │    • Push     • Filesystem    │  │
│  └───────────────┼───────────────┘  │
│                  │ HTTPS              │
└──────────────────┼───────────────────┘
                   ▼
        https://api.primeinfraa.com
        (Cloudflare Tunnel → your office server laptop)
```

## 2. Architecture (Capacitor)

```
Current StockYard Frontend (Next.js)
├── src/app/login/          ← Used as-is
├── src/app/dashboard/      ← Used as-is
│   ├── inventory/
│   ├── projects/
│   ├── stock/
│   ├── gatepass/
│   ├── purchase-orders/
│   ├── scan/               ← Barcode scanner works via @zxing (uses camera API)
│   ├── suppliers/
│   ├── users/
│   ├── categories/
│   └── settings/
├── src/lib/api.ts          ← Points to office server via Cloudflare Tunnel
├── src/store/auth.ts       ← Used as-is
└── src/components/         ← Used as-is

+ android/                  ← NEW: Capacitor-generated native Android project
  ├── app/
  │   ├── src/main/
  │   │   ├── java/com/primeinfraa/stockyard/
  │   │   │   └── MainActivity.java
  │   │   ├── res/          ← Icons, splash screen
  │   │   └── AndroidManifest.xml
  │   └── build.gradle
  └── capacitor.config.ts
```

## 3. Prerequisites

On your development machine (Linux/Windows/Mac):

```bash
# Node.js (already have this)
node -v   # v20+

# Java Development Kit (JDK 17)
sudo apt install -y openjdk-17-jdk
java -version

# Android Studio
# Download from: https://developer.android.com/studio
# Install and open it
# Go to: Settings → SDK Manager → Install:
#   - Android SDK Platform 34 (Android 14)
#   - Android SDK Build-Tools 34
#   - Android SDK Command-line Tools
#   - Android Emulator (for testing)

# Set environment variables
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc

# Verify
adb --version
```

## 4. Project Setup

```bash
cd /path/to/StockYard2/frontend

# Install Capacitor
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init "StockYard" "com.primeinfraa.stockyard" \
  --web-dir=out

# Add Android platform
npm install @capacitor/android
npx cap add android
```

This creates an `android/` folder inside `frontend/` with a full Android Studio project.

## 5. Configure Next.js for Static Export

Capacitor needs static HTML/CSS/JS files (it can't run a Node.js server inside the app). Next.js can export as static files:

**`frontend/next.config.js`:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // ← Enable static export
  distDir: 'out',            // ← Output to 'out/' directory
  reactStrictMode: true,
  images: {
    unoptimized: true,        // ← Required for static export
  },
  env: {
    // This URL resolves via Cloudflare Tunnel to your office server laptop
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.primeinfraa.com/api/v1',
  },
  // Trailing slashes help with static file routing
  trailingSlash: true,
};

module.exports = nextConfig;
```

**Important caveats with static export:**
- No server-side rendering (SSR) — all pages become client-side rendered
- No API routes (not an issue — your API is on the backend server)
- No `next/image` optimization (already disabled with `unoptimized: true`)
- Dynamic routes like `[id]` need `generateStaticParams()` or workarounds

```bash
# Build static export
cd frontend
npm run build    # Generates 'out/' folder with static files

# Copy to Android project
npx cap copy android
npx cap sync android
```

## 6. Alternative: Live Server Mode (Recommended)

Instead of bundling static files inside the APK, **point the Capacitor WebView directly to your office server's frontend** (exposed via Cloudflare Tunnel). This is simpler and means the app always shows the latest version.

**`frontend/capacitor.config.ts`:**
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.primeinfraa.stockyard',
  appName: 'StockYard',
  webDir: 'out',
  
  // ✅ Point to your office server frontend (via Cloudflare Tunnel)
  // This URL tunnels through Cloudflare to your Ubuntu laptop in the office
  server: {
    url: 'https://app.primeinfraa.com',
    cleartext: false,     // false = HTTPS only (Cloudflare provides free SSL)
  },

  // Android-specific settings
  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: true,
      spinnerColor: '#4f46e5',
    },
  },
};

export default config;
```

**Advantages of Live Server Mode:**
- No need for static export (avoids Next.js SSR compatibility issues)
- App always shows latest version (update files on office laptop → all phones see it instantly)
- Smaller APK size (just the native shell, ~5MB instead of ~50MB)
- No rebuild/republish needed for UI changes

**Disadvantages:**
- Requires internet connection (no offline support)
- Slightly slower initial load (loads from network)
- Requires the office laptop to be running (if the laptop is off, the app won't load)

**For StockYard, Live Server Mode is recommended** because:
1. Your app requires internet anyway (to reach the backend API on your office server)
2. You want all users on the latest version automatically (just update the laptop, all devices see it)
3. Avoids the complexity of static export with Next.js App Router
4. All platforms (Windows, Linux, Mac, Android) connect to the same office server

## 7. Add Native Plugins

Capacitor has plugins for native features:

```bash
# Camera (for barcode scanning — your @zxing already uses this via browser API, but native is better)
npm install @capacitor/camera
npx cap sync android

# Push Notifications
npm install @capacitor/push-notifications
npx cap sync android

# Status Bar (control appearance)
npm install @capacitor/status-bar
npx cap sync android

# App (handle back button, app state)
npm install @capacitor/app
npx cap sync android

# Haptics (vibration feedback on scan)
npm install @capacitor/haptics
npx cap sync android

# Share (share PDF reports)
npm install @capacitor/share
npx cap sync android

# Network (detect online/offline)
npm install @capacitor/network
npx cap sync android
```

### Using Camera for Barcode Scanning

Your current barcode scanner uses `@zxing/browser` which accesses the camera through the browser API. This **already works** in the Capacitor WebView. But for a better native experience, you can use:

```typescript
// In your scan page, detect if running in Capacitor:
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType } from '@capacitor/camera';

const isNative = Capacitor.isNativePlatform();

if (isNative) {
  // Use native camera
  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Uri,
  });
} else {
  // Use existing @zxing browser-based scanner
}
```

**In practice, your existing `@zxing` scanner works fine in Capacitor's WebView without changes.**

## 8. Theming & Splash Screen

### App Icon
Create a 1024×1024 PNG icon and use Capacitor's asset generator:

```bash
npm install -g @capacitor/assets

# Place your icon at:
# frontend/assets/icon-only.png    (1024x1024, no background)
# frontend/assets/icon-background.png  (1024x1024, background color)
# frontend/assets/splash.png       (2732x2732)
# Or a single:
# frontend/assets/icon.png         (1024x1024)

npx capacitor-assets generate --android
```

This auto-generates all required Android icon sizes and splash screens.

### Status Bar Configuration

```typescript
// In your app's main layout or _app.tsx:
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  StatusBar.setBackgroundColor({ color: '#1a1a2e' });
  StatusBar.setStyle({ style: Style.Dark });
}
```

## 9. Build the APK

### Debug APK (for testing)

```bash
# Sync web files and plugins
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Click **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. APK is at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for distribution/Play Store)

```bash
# In Android Studio:
# Build → Generate Signed Bundle / APK
# Choose APK
# Create a new keystore (KEEP THIS FILE SAFE — you need it for every update)
#   - Key store path: /path/to/stockyard-release-key.jks
#   - Password: (choose a strong password)
#   - Key alias: stockyard
# Choose "release" build variant
# Click Create
```

Or via command line:

```bash
cd frontend/android

# Create signing key (one-time)
keytool -genkey -v \
  -keystore stockyard-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias stockyard \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Prime Infraa, OU=IT, O=Prime Infraa Engineering, L=Delhi, ST=Delhi, C=IN"

# Build release APK
./gradlew assembleRelease

# APK at: app/build/outputs/apk/release/app-release.apk
```

### Direct APK Distribution (Without Play Store)

You can distribute the APK directly:
1. Upload to your server: `scp app-release.apk deploy@server:/home/deploy/stockyard-releases/`
2. Share download link: `https://primeinfraa.com/downloads/StockYard-1.0.0.apk`
3. Users download and install (they'll need to enable "Install from unknown sources")

## 10. Testing

### On Emulator
```bash
# In Android Studio → Device Manager → Create Virtual Device
# Choose Pixel 7 or similar → API 34
# Run the app on the emulator
```

### On Physical Device
```bash
# Enable Developer Options on your phone:
# Settings → About Phone → Tap "Build Number" 7 times
# Settings → Developer Options → Enable USB Debugging

# Connect phone via USB
adb devices    # Should show your device

# Run from Android Studio → Select your device → Run
```

### Testing Checklist

```
□ Login screen loads
□ Can log in with existing credentials
□ Dashboard loads with correct data
□ Navigation between all sections works
□ Inventory list loads
□ Can create/edit items
□ Barcode scanner opens camera
□ Barcode scanning detects items
□ Stock in/out works
□ Gate pass creation works
□ PDF generation works
□ Projects section works
□ Requirements can be raised
□ Purchase orders load
□ Audit log shows entries
□ Back button behavior is correct
□ App handles no internet gracefully
□ App resumes correctly after backgrounding
□ Landscape/portrait rotation works
□ Keyboard doesn't cover input fields
```

## 11. Publish to Play Store

### One-Time Setup

1. **Google Play Developer Account:** https://play.google.com/console — $25 one-time fee
2. Create a new app in Play Console
3. Fill in:
   - App name: StockYard
   - Default language: English
   - App or Game: App
   - Free or Paid: Free
4. Fill Store listing:
   - Short description: "Inventory management for construction & infrastructure"
   - Full description: (detailed feature list)
   - Screenshots (phone + tablet): Take screenshots from the emulator
   - Feature graphic (1024×500): Create in Canva or similar
   - App icon (512×512): Your StockYard icon

### Upload

1. Go to **Production → Create new release**
2. Upload the signed APK (or AAB — Android App Bundle, preferred)
3. Add release notes
4. Submit for review

Review typically takes 1–3 days.

### Build AAB (Preferred Over APK for Play Store)

```bash
cd frontend/android
./gradlew bundleRelease
# AAB at: app/build/outputs/bundle/release/app-release.aab
```

## 12. Updating the App

### If Using Live Server Mode (Recommended)
Update the code on your office server laptop. The app automatically shows the new version next time it loads. **No app store update needed for UI changes.** All devices (Windows desktop, Linux desktop, Android) see the update immediately.

### If Using Static Export Mode
```bash
cd frontend
npm run build           # Rebuild static files
npx cap copy android    # Copy to Android project
npx cap sync android    # Sync plugins
cd android
./gradlew assembleRelease  # Build new APK
# Upload to Play Store or distribute directly
```

### For Native Changes (new plugins, Android config)
Requires a new APK upload to Play Store.

## 13. Capacitor Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Reuse 100% of existing code | ❌ Performance is "web-like", not native |
| ✅ 1-2 days of work | ❌ Animations may not feel as smooth |
| ✅ One codebase for web + Android | ❌ Larger APK if bundling static files |
| ✅ Web updates = instant mobile updates | ❌ Some native features need plugin bridge |
| ✅ Your @zxing barcode scanner works as-is | ❌ "App Store rejection" risk is low but exists |
| ✅ React-PDF works as-is | ❌ Heavy pages may feel slow on low-end phones |
| ✅ Easy to maintain | |
| ✅ Can also do iOS with same code | |

---

# Option B: React Native (Full Rewrite)

## 14. What Is React Native?

React Native builds **truly native** Android (and iOS) apps using React. Instead of rendering HTML in a WebView, it renders **native Android UI components** (Java/Kotlin views). The JavaScript logic runs in a JS engine (Hermes) and communicates with native code over a bridge.

Your code looks like React, but uses `<View>` instead of `<div>`, `<Text>` instead of `<p>`, and `<ScrollView>` instead of overflow scrolling.

## 15. Architecture (React Native)

```
┌──────────────────────────────────────────────────┐
│              React Native App                     │
│                                                   │
│  JavaScript Thread (Hermes Engine)                │
│  ┌─────────────────────────────────────────────┐ │
│  │  Your React Code                             │ │
│  │  ├── screens/LoginScreen.tsx                 │ │
│  │  ├── screens/DashboardScreen.tsx             │ │
│  │  ├── screens/InventoryScreen.tsx             │ │
│  │  ├── screens/ScanScreen.tsx                  │ │
│  │  ├── lib/api.ts  ← 95% reusable from web    │ │
│  │  ├── store/auth.ts ← 100% reusable          │ │
│  │  └── ...                                     │ │
│  └──────────────────┬──────────────────────────┘ │
│                     │ React Native Bridge         │
│  ┌──────────────────▼──────────────────────────┐ │
│  │  Native UI Components                        │ │
│  │  (Android Views: TextView, ScrollView, etc.) │ │
│  │  ← Truly native, not HTML/WebView           │ │
│  └──────────────────────────────────────────────┘ │
│                     │ API calls                    │
└─────────────────────┼────────────────────────────┘
                      ▼
           https://api.primeinfraa.com
           (Cloudflare Tunnel → your office server laptop)
```

## 16. Prerequisites

```bash
# Node.js (already have)
node -v

# Java JDK 17
sudo apt install -y openjdk-17-jdk

# Android Studio (same as Capacitor — see Section 3)

# React Native CLI
npm install -g react-native-cli

# Watchman (file watcher, recommended)
sudo apt install -y watchman
```

## 17. Project Setup

Create a new React Native project alongside your existing code:

```bash
cd /path/to/StockYard2

# Create React Native project
npx react-native@latest init StockYardMobile --template react-native-template-typescript

# Structure:
# StockYard2/
# ├── backend/          ← Existing (unchanged)
# ├── frontend/         ← Existing web app (unchanged)
# ├── StockYardMobile/  ← NEW React Native app
# └── ...
```

### Install Core Dependencies

```bash
cd StockYardMobile

# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler

# API & State
npm install axios zustand
npm install @tanstack/react-query

# Forms
npm install react-hook-form @hookform/resolvers zod

# UI Components
npm install react-native-paper          # Material Design components
npm install react-native-vector-icons   # Icons (like lucide-react)
npm install react-native-svg            # SVG support

# Date handling
npm install date-fns

# Barcode Scanner
npm install react-native-vision-camera
npm install react-native-worklets-core
npm install react-native-barcode-scanner-google  # or vision-camera-code-scanner

# Charts
npm install react-native-chart-kit
npm install react-native-svg            # Required by chart-kit

# PDF
npm install react-native-pdf
npm install rn-fetch-blob               # File handling

# Storage
npm install @react-native-async-storage/async-storage

# Toast notifications
npm install react-native-toast-message

# JWT
npm install jwt-decode
```

## 18. Project Structure

```
StockYardMobile/
├── android/                        # Native Android code (auto-generated)
├── src/
│   ├── api/
│   │   └── api.ts                  # ← Copy from frontend/src/lib/api.ts (modify slightly)
│   ├── store/
│   │   └── auth.ts                 # ← Copy from frontend/src/store/auth.ts (change localStorage → AsyncStorage)
│   ├── screens/
│   │   ├── LoginScreen.tsx         # ← Rewrite UI (logic from frontend/src/app/login/page.tsx)
│   │   ├── DashboardScreen.tsx     # ← Rewrite UI
│   │   ├── InventoryScreen.tsx
│   │   ├── InventoryDetailScreen.tsx
│   │   ├── ProjectsScreen.tsx
│   │   ├── ProjectDetailScreen.tsx
│   │   ├── StockInScreen.tsx
│   │   ├── StockOutScreen.tsx
│   │   ├── ScanScreen.tsx
│   │   ├── GatePassScreen.tsx
│   │   ├── GatePassCreateScreen.tsx
│   │   ├── PurchaseOrdersScreen.tsx
│   │   ├── SuppliersScreen.tsx
│   │   ├── UsersScreen.tsx
│   │   ├── CategoriesScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── DataTable.tsx           # ← React Native table component
│   │   ├── SearchBar.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   └── FormInput.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # Main navigation structure
│   │   ├── AuthNavigator.tsx       # Login flow
│   │   └── DashboardNavigator.tsx  # Tab/drawer navigation
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useInventory.ts
│   │   └── useProjects.ts
│   ├── types/
│   │   └── index.ts                # ← Share types with backend
│   └── theme/
│       └── index.ts                # Colors, fonts, spacing
├── App.tsx
├── package.json
└── tsconfig.json
```

## 19. Reusable Code from Current App

Here's what you can reuse from the existing Next.js frontend vs what must be rewritten:

| File/Logic | Reusability | Notes |
|-----------|------------|-------|
| `lib/api.ts` (axios setup, interceptors) | **95% reusable** | Change `localStorage` → `AsyncStorage` |
| `store/auth.ts` (zustand auth store) | **90% reusable** | Change `localStorage` → `AsyncStorage` |
| API call functions in pages | **80% reusable** | Copy the fetch/mutation logic |
| Zod validation schemas | **100% reusable** | Identical |
| TypeScript interfaces/types | **100% reusable** | Copy as-is |
| Form logic (react-hook-form) | **90% reusable** | Same hooks, different UI components |
| Date formatting (date-fns) | **100% reusable** | Identical |
| TanStack Query hooks | **95% reusable** | Same API, different rendering |
| **UI Components (JSX/HTML)** | **0% reusable** | Must rewrite with React Native components |
| **CSS/Tailwind styles** | **0% reusable** | Must rewrite with StyleSheet or styled-components |
| `@react-pdf/renderer` | **0% reusable** | Use `react-native-pdf` or server-side PDF generation |
| `@zxing` barcode scanner | **0% reusable** | Use `react-native-vision-camera` |
| `recharts` | **0% reusable** | Use `react-native-chart-kit` |
| `@tanstack/react-table` | **0% reusable** | Use `FlatList` with custom rendering |
| `lucide-react` icons | **0% reusable** | Use `react-native-vector-icons` |

**Bottom line:** ~60% of the logic is reusable, but ~100% of the UI must be rewritten.

## 20. Screen-by-Screen Implementation

### Example: Login Screen

**Current web version (`frontend/src/app/login/page.tsx`) uses:**
- HTML `<form>`, `<input>`, `<button>`
- Tailwind CSS classes
- `react-hook-form` + `zod`
- `api.post('/auth/login')`
- `useAuthStore` from zustand

**React Native version:**

```tsx
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/api';
import { useAuthStore } from '../store/auth';
import Toast from 'react-native-toast-message';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),  // ← Same Zod schema as web
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', data);  // ← Same API call as web
      const { user, accessToken, refreshToken } = response.data.data;
      login(user, accessToken, refreshToken);  // ← Same zustand action as web
      navigation.replace('Dashboard');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.response?.data?.message || 'Invalid credentials',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>StockYard</Text>
        <Text style={styles.subtitle}>Inventory Management System</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder="project@primeinfraa.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder="Enter password"
                secureTextEntry
              />
              {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
            </View>
          )}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

Notice how the **form logic, validation, API calls, and state management are almost identical** to the web version. Only the JSX and styling are different.

## 21. Navigation Setup

```tsx
// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/auth';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import InventoryScreen from '../screens/InventoryScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import ScanScreen from '../screens/ScanScreen';
import GatePassScreen from '../screens/GatePassScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: 'view-dashboard',
            Inventory: 'package-variant',
            Scan: 'barcode-scan',
            Projects: 'folder-multiple',
            More: 'dots-horizontal',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Projects" component={ProjectsScreen} />
      <Tab.Screen name="More" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardTabs} />
            <Stack.Screen name="GatePass" component={GatePassScreen} />
            {/* Add more stack screens for detail views */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## 22. API Layer

Almost identical to the web version:

```typescript
// src/api/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// This URL tunnels via Cloudflare to your office server laptop
const API_URL = 'https://api.primeinfraa.com/api/v1';   // ← Your office server (via Cloudflare Tunnel)

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor — same logic, AsyncStorage instead of localStorage
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — same refresh token logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = response.data.data;
          await AsyncStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        // Navigate to login (use a navigation ref or event emitter)
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

## 23. Authentication

```typescript
// src/store/auth.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (user, accessToken, refreshToken) => {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    try {
      const [accessToken, refreshToken, userStr] = await AsyncStorage.multiGet([
        'accessToken', 'refreshToken', 'user'
      ]);
      if (accessToken[1] && userStr[1]) {
        set({
          accessToken: accessToken[1],
          refreshToken: refreshToken[1],
          user: JSON.parse(userStr[1]),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
```

## 24. Barcode Scanning

```tsx
// src/screens/ScanScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import api from '../api/api';
import Toast from 'react-native-toast-message';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [scanMode, setScanMode] = useState<'in' | 'out'>('in');
  const [isScanning, setIsScanning] = useState(true);
  const device = useCameraDevice('back');

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39'],
    onCodeScanned: async (codes) => {
      if (!isScanning || codes.length === 0) return;
      setIsScanning(false);

      const barcode = codes[0].value;
      
      try {
        // Same API call as web version
        const response = await api.get(`/items?barcode=${barcode}`);
        const items = response.data.data.items;
        
        if (items.length > 0) {
          const item = items[0];
          // Process stock in/out — same logic as web
          await api.post('/stock/movement', {
            itemId: item.id,
            type: scanMode === 'in' ? 'IN' : 'OUT',
            quantity: 1,
          });
          
          Toast.show({
            type: 'success',
            text1: `Stock ${scanMode.toUpperCase()}`,
            text2: `${item.name} — Qty: 1`,
          });
        } else {
          Alert.alert('Unknown Barcode', `No item found for ${barcode}`);
        }
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to process scan' });
      }

      // Resume scanning after 2 seconds
      setTimeout(() => setIsScanning(true), 2000);
    },
  });

  if (!hasPermission) return <Text>Camera permission required</Text>;
  if (!device) return <Text>No camera found</Text>;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />
      
      {/* Scan mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'in' && styles.modeActive]}
          onPress={() => setScanMode('in')}
        >
          <Text style={styles.modeText}>Stock IN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'out' && styles.modeActive]}
          onPress={() => setScanMode('out')}
        >
          <Text style={styles.modeText}>Stock OUT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeToggle: {
    position: 'absolute', bottom: 40,
    flexDirection: 'row', alignSelf: 'center', gap: 12,
  },
  modeButton: {
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modeActive: { backgroundColor: '#4f46e5' },
  modeText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
```

## 25. PDF Generation

Two approaches:

**Approach A: Server-side PDF (Recommended)**

Add a PDF endpoint to your backend that generates the PDF and returns it:
```typescript
// Backend: GET /api/v1/gatepass/:id/pdf → Returns PDF buffer
// Frontend: Download and open with the phone's PDF viewer

import RNFetchBlob from 'rn-fetch-blob';
import { Share } from 'react-native';

async function downloadGatePassPDF(gatePassId: string) {
  const token = await AsyncStorage.getItem('accessToken');
  const response = await RNFetchBlob.fetch('GET', 
    `https://api.primeinfraa.com/api/v1/gatepass/${gatePassId}/pdf`,  // Office server via tunnel
    { Authorization: `Bearer ${token}` }
  );
  
  const path = response.path();
  await Share.share({ url: `file://${path}` });
}
```

**Approach B: Client-side PDF**

Use `react-native-html-to-pdf` to generate PDFs from HTML templates on the phone.

## 26. Charts & Analytics

```tsx
// Replace recharts with react-native-chart-kit
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

<BarChart
  data={{
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{ data: [20, 45, 28, 80, 99] }],
  }}
  width={screenWidth - 40}
  height={220}
  yAxisLabel=""
  chartConfig={{
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
  }}
  style={{ borderRadius: 12 }}
/>
```

## 27. Push Notifications

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

1. Create a Firebase project at https://console.firebase.google.com/
2. Add your Android app (package: `com.primeinfraa.stockyard`)
3. Download `google-services.json` → place in `android/app/`
4. Configure:

```typescript
// src/notifications/setup.ts
import messaging from '@react-native-firebase/messaging';
import api from '../api/api';

export async function setupNotifications() {
  const authStatus = await messaging().requestPermission();
  
  if (authStatus) {
    const fcmToken = await messaging().getToken();
    // Send token to your backend
    await api.post('/users/push-token', { token: fcmToken, platform: 'android' });
  }
  
  // Handle background messages
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background notification:', remoteMessage);
  });
  
  // Handle foreground messages
  messaging().onMessage(async (remoteMessage) => {
    // Show local notification
    Toast.show({
      type: 'info',
      text1: remoteMessage.notification?.title,
      text2: remoteMessage.notification?.body,
    });
  });
}
```

**Backend would need a new endpoint** to send push notifications (e.g., when a requirement is approved, when stock is low).

## 28. Offline Support

React Native makes offline support much easier than a web app:

```typescript
// src/hooks/useOfflineSync.ts
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Queue actions when offline, sync when back online
class OfflineQueue {
  private queue: any[] = [];

  async addAction(action: { method: string; url: string; data: any }) {
    this.queue.push({ ...action, timestamp: Date.now() });
    await AsyncStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }

  async sync() {
    const stored = await AsyncStorage.getItem('offlineQueue');
    if (!stored) return;
    
    const actions = JSON.parse(stored);
    for (const action of actions) {
      try {
        await api[action.method](action.url, action.data);
      } catch (error) {
        console.error('Sync failed for:', action);
      }
    }
    
    await AsyncStorage.removeItem('offlineQueue');
    this.queue = [];
  }
}

// Listen for connectivity changes
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    offlineQueue.sync();  // Auto-sync when back online
  }
});
```

## 29. Build the APK

```bash
cd StockYardMobile

# Debug build
npx react-native run-android

# Release build
cd android

# Create signing key (one-time)
keytool -genkey -v \
  -keystore stockyard-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias stockyard

# Configure signing in android/app/build.gradle
# (Add signingConfigs and set release build to use it)

# Build release APK
./gradlew assembleRelease

# APK at: app/build/outputs/apk/release/app-release.apk
```

## 30. Publish to Play Store

Same process as [Section 11](#11-publish-to-play-store) above. Build an AAB instead:

```bash
cd android
./gradlew bundleRelease
# AAB at: app/build/outputs/bundle/release/app-release.aab
```

## 31. React Native Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Truly native performance & feel | ❌ 2-4 weeks of development |
| ✅ Smooth 60fps animations | ❌ All UI must be rewritten |
| ✅ Full native API access | ❌ Separate codebase to maintain |
| ✅ Offline support is natural | ❌ Need React Native expertise |
| ✅ Smaller APK (~15MB) | ❌ Different styling system (no CSS) |
| ✅ Native barcode scanning | ❌ Different navigation model |
| ✅ Push notifications (native) | ❌ Breaking changes in RN upgrades |
| ✅ Better battery efficiency | ❌ Debugging is harder |
| ✅ Can do iOS too | ❌ Some web libraries don't have RN equivalents |

---

# Comparison

## 32. Side-by-Side Comparison

| | **Capacitor** | **React Native** |
|---|---|---|
| **Development time** | 1-2 days | 2-4 weeks |
| **Code reuse from web** | ~100% | ~60% (logic only) |
| **Performance** | Good (WebView) | Excellent (Native) |
| **UI smoothness** | 7/10 | 9.5/10 |
| **App size** | ~5MB (live) / ~50MB (static) | ~15-25MB |
| **Maintenance** | Minimal (web changes = app changes) | Medium (separate codebase) |
| **Offline support** | Limited (service worker) | Full (AsyncStorage + SQLite) |
| **Barcode scanning** | Works (@zxing via browser) | Native (VisionCamera, faster) |
| **Push notifications** | Via Capacitor plugin | Native Firebase |
| **Play Store ready** | Yes | Yes |
| **Separate codebase** | No (same frontend) | Yes (new project) |
| **Skills required** | None new | React Native knowledge |
| **Web updates = App updates** | Yes (live mode) | No (separate builds) |
| **iOS support** | Yes (same project) | Yes (same project) |
| **Low-end phone performance** | Slower (WebView overhead) | Fast |
| **Cost** | Free | Free |

## 33. Which One Should You Choose?

```
START
  │
  ▼
Do you need offline support for field workers?
  ├── YES → React Native
  ├── NO ──▼
  │
Is native 60fps animation important?
  ├── YES → React Native
  ├── NO ──▼
  │
Do you have 2-4 weeks for mobile development?
  ├── YES → React Native (better long-term)
  ├── NO ──▼
  │
Do you want instant updates without Play Store review?
  ├── YES → Capacitor (Live Server Mode)
  ├── NO ──▼
  │
  └── Capacitor (simplest path)
```

### Recommendation for StockYard

| Phase | Action | Timeline |
|-------|--------|----------|
| **Now** | **Capacitor Live Server Mode** | 1-2 days |
| | Wrap existing web app, point to office server frontend | |
| | Get the app on users' phones immediately | |
| **Later (if needed)** | **React Native rewrite** | 2-4 weeks |
| | When you need offline sync, native scanning | |
| | Or when performance on cheap phones is an issue | |

**Start with Capacitor.** If it's "good enough" (it usually is for business apps), stop there. If users complain about performance or you need offline, upgrade to React Native later.

> **Important:** With the office server architecture, ALL client types (Windows/Linux/Mac desktop apps, web browsers, and Android apps) connect to the same backend on your Ubuntu laptop via `https://api.primeinfraa.com` (Cloudflare Tunnel). You maintain ONE server, ONE database, and all platforms stay in sync.

---

## Development Timeline Estimate

### Capacitor (Option A)

| Task | Time |
|------|------|
| Install Capacitor + Android platform | 30 min |
| Configure capacitor.config.ts (live server) | 15 min |
| Generate icons + splash screen | 30 min |
| Build APK | 15 min |
| Test on phone | 1 hour |
| Fix any issues | 1-2 hours |
| **Total** | **3-5 hours** |

### React Native (Option B)

| Task | Time |
|------|------|
| Project setup + navigation | 1 day |
| Login screen | 0.5 day |
| Dashboard screen | 1 day |
| Inventory list + detail screens | 1.5 days |
| Stock in/out screens | 1 day |
| Barcode scanning | 1 day |
| Gate pass screens + PDF | 1.5 days |
| Projects + requirements screens | 1.5 days |
| Purchase orders + suppliers | 1 day |
| Users + settings screens | 0.5 day |
| Charts/analytics | 1 day |
| Testing + bug fixes | 2 days |
| **Total** | **~13-15 working days** |

---

## Important: Office Server Considerations for Mobile

### Uptime
Since your backend runs on a laptop in the office, the Android app **will not work when the laptop is off or disconnected**. Ensure:
- The laptop is always powered on (connect to UPS for power outages)
- Ubuntu is configured to auto-login or start services on boot
- PM2 auto-starts the backend on system restart: `pm2 startup && pm2 save`
- Cloudflare Tunnel (`cloudflared`) is set up as a systemd service for auto-start

### Performance
- A laptop can comfortably handle 20-50 concurrent users
- SQLite handles ~100 concurrent reads; consider PostgreSQL if you scale beyond that
- The Cloudflare Tunnel adds minimal latency (~5-20ms)

### Fallback for Mobile Users
If the office server goes down, mobile users will see a connection error. Consider:
1. Adding a "Server Unavailable" screen in the app that shows when the API is unreachable
2. Implementing basic offline caching (read-only) so users can at least view recent data
3. Setting up uptime monitoring (e.g., UptimeRobot free tier) to alert you if the server goes down

### Cross-Platform Client Summary

| Client | OS | Connects To | How |
|--------|----|-----------|---------|
| Desktop App (Electron) | Windows | `https://api.primeinfraa.com` | Built-in backend URL |
| Desktop App (Electron) | Linux | `https://api.primeinfraa.com` | Built-in backend URL  |
| Desktop App (Electron) | macOS | `https://api.primeinfraa.com` | Built-in backend URL  |
| Web Browser | Any | `https://app.primeinfraa.com` | Direct browser access |
| Android App (this guide) | Android | `https://api.primeinfraa.com` | Capacitor or React Native |
| Office LAN PCs | Any | `http://192.168.x.x:5000` | Direct LAN (no tunnel needed) |

All traffic from outside the office goes through the Cloudflare Tunnel. PCs on the same office LAN can optionally connect directly to the laptop's local IP for faster response.
