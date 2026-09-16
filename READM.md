# Investment Tracker

<p align="center">
  <img src="./assets/icon.png" width="96" height="96" alt="Investment Tracker Logo" style="border-radius: 20px;" />
</p>

<p align="center">
  <b>A Local-First, Privacy-Centric Multi-Exchange Portfolio & Capital Silo Tracking App</b>
</p>

<p align="center">
  English | <a href="./README.zh.md">简体中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.76.9-61DAFB?logo=react&logoColor=white" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-52.0.37-000020?logo=expo&logoColor=white" alt="Expo SDK 52" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite-Local_First-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Build-Android_APK-3DDC84?logo=android&logoColor=white" alt="Android Build" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 📖 Overview

**Investment Tracker** is a modern, minimalist, high signal-to-noise ratio personal asset management application built specifically for cryptocurrency investors (with seamless extensibility to traditional equities).

Unlike centralized portfolio trackers that upload sensitive financial data to the cloud, or lightweight apps that detach from real-world trading dynamics by allowing out-of-thin-air trades, Investment Tracker embraces the **"Exchange Aggregator"** and **"Local Capital Silo"** principles:

- **100% Data Sovereignty**: Powered by local SQLite storage with zero server-side sync. Your portfolio data never leaves your device.
- **Realistic Capital Discipline**: Enforces **Deposit-First Trading**. Exchange balances (Binance, OKX, Coinbase, etc.) are strictly siloed. Purchases deduct from your available stablecoin deposits on that specific platform, while sell proceeds automatically flow back into the platform's cash reserve.
- **Institutional-Grade PnL Engine**: Weighted-average cost basis accounting that rigorously segregates Unrealized PnL from Realized PnL with precision calculations.

---

## ✨ Key Features

### 🏦 1. Multi-Exchange Capital Sandbox & Silo Isolation
- **Independent Cash Reserves**: Each trading venue (Binance, OKX, Coinbase, etc.) operates as an isolated accounting unit.
- **Deposit-First Trading**: Buy orders require sufficient available stablecoin (USDT / USDC) capital on the selected platform. If capital is insufficient, orders are intercepted with one-click deposit shortcuts.
- **Automatic Proceeds Reinvestment**: Flat cash proceeds from token sales flow straight into the platform's stablecoin reserve.

### 📊 2. Advanced PnL Engine
- **Aggregated Portfolio Valuation**: Total Net Worth = Real-time Market Value of Holdings + Idle Stablecoin Capital Reserves across all exchanges.
- **Dual Performance Perspectives**:
  - **Cumulative PnL View**: Calculates overall Return on Investment (ROI) using net cumulative deposits as the denominator.
  - **24H Daily Fluctuation View**: Accurate price delta calculation derived from the 24H prior baseline to eliminate compounding distortion.
- **Order-Level Inspection**: Tracks individual execution cost basis, realized profits/losses, and percentage gains per transaction.

### 📈 3. Interactive Charts & Deep Transaction Flow
- **Multi-Timeframe Price Trends**: Full-featured interactive charts across `24H`, `1W`, `1M`, `1Y`, and `ALL`.
- **Long-Press Crosshair & Cursor**: Drag across the chart canvas to inspect historic price points and timestamps in real time.
- **Lifetime Performance Card**: Summary metrics including win rates, open vs. closed positions, cumulative cost, and total proceeds.

### 🌓 4. Dual High-Fidelity Theme (Dark & Light)
- Meticulously designed color palettes (Sleek Dark and Pure Light) adhering to financial UI standards.
- No harsh pure blacks or glaring whites. Custom dark slate and warm card tones with automatic adaptation across shadows, borders, status bars, and input controls.

### 🔒 5. Privacy & Security
- **Anti-Peeping Privacy Mode**: One-tap toggle to mask balances and position percentages with `••••` across dashboard and detail screens.
- **App Switcher Privacy Shield**: Automatically applies a blur shroud when the app switches to the background or multitasking switcher.
- **Biometric Security**: Ready for Face ID and fingerprint authentication locks.

### 🌍 6. Internationalization & Data Autonomy
- **Multilingual & Multi-Currency**: Instant toggle between Simplified Chinese and English; realtime FX conversion across USD, CNY, and EUR.
- **Standard CSV Export & Sharing**: Export transaction orders and deposit/withdrawal histories to CSV files with native system sharing.

---

## 🏗️ Architecture & Tech Stack

```
investment-tracker/
├── App.tsx                     # Root component, state dispatching & modal coordination
├── bump-version.js             # Automated semver & Android versionCode increment script
├── package.json                # Project dependencies & npm scripts
├── app.json                    # Expo project configuration
├── android/                    # Native Android project (via Expo Prebuild)
├── document/
│   └── PRD.md                  # Comprehensive Product Requirements Document (v1.3.0)
└── src/
    ├── components/             # Reusable UI component library
    │   ├── charts/             # Interactive SVG charts & crosshair
    │   ├── common/             # Icons, Date-time pickers, modals
    │   ├── detail/             # Asset detail, Capital detail, transaction lists
    │   ├── drawer/             # Sidebar drawer navigation
    │   ├── portfolio/          # Dashboard cards, holding list, capital list
    │   ├── settings/           # App settings, platform toggles, CSV export
    │   └── transactions/       # Add transaction & deposit/withdraw modals
    ├── database/               # Local SQLite storage layer (Repository pattern)
    ├── domain/                 # Business domain models, PnLEngine, types
    ├── services/               # Exchange price adapters (Binance, OKX), FX service
    ├── theme/                  # Theme tokens (Dark & Light palettes)
    └── i18n/                   # Bilingual translation dictionary & interpolation
```

### Key Technologies
- **Core Framework**: React Native `0.76.9` + Expo SDK `52` (New Architecture enabled)
- **Database**: `expo-sqlite` (Local-first persistent storage)
- **Precision Mathematics**: `bignumber.js` (Eliminates floating-point rounding errors)
- **Vector & Chart Graphics**: `react-native-svg`
- **File System & Sharing**: `expo-file-system`, `expo-sharing`, `expo-document-picker`
- **Code Quality**: TypeScript 5.3 + Jest automated unit test suites

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `>= 18` (Node.js 20 or 22 LTS recommended)
- **Package Manager**: `npm` or `yarn`
- **Mobile Development Environment**:
  - Android: JDK 17 + Android Studio (Android SDK 34)
  - iOS: macOS + Xcode + CocoaPods (Optional)

### 2. Install Dependencies
```bash
git clone https://github.com/rick-hayek/investment-tracker.git
cd investment-tracker
npm install
```

### 3. Start Local Development
```bash
# Start Expo development server
npm start

# Run directly on Android emulator / physical device
npm run android

# Run on iOS simulator (macOS only)
npm run ios

# Run web preview
npm run web
```

---

## 🧪 Testing & Quality Assurance

The codebase includes an extensive automated test suite covering mathematical engines, deposit sandboxes, and repository workflows:

```bash
# Run all Jest unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate unit test coverage report
npm run test:coverage

# Perform TypeScript static typecheck
npm run typecheck
```

---

## 📦 Version Management & Build Pipeline

### 1. Automated Version Bumping (`bump-version.js`)
Synchronizes version increments across `package.json`, `app.json`, `package-lock.json`, and Android `build.gradle`:

```bash
# Method A: Automatic patch increment (e.g. 1.0.0 -> 1.0.1, versionCode increments by 1)
npm run bump-version
# or
node bump-version.js

# Method B: Explicit version specification (e.g. 1.1.6, versionCode increments by 1)
npm run bump-version -- 1.1.6
# or
node bump-version.js 1.1.6
```

### 2. Local Android Release Build
```bash
npm run android:release
```
Output artifact: `android/app/build/outputs/apk/release/app-release.apk`.

### 3. CI/CD Pipeline
Integrated with GitHub Actions (`.github/workflows/build-apk.yml`):
- Pushing a Git Tag matching `v*` (e.g., `git tag v1.0.1 && git push origin v1.0.1`) automatically triggers cloud builds and publishes a GitHub Release with the APK.
- Manual trigger (Workflow Dispatch) supported in the GitHub Actions tab for Debug and Release builds.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Free for personal use, learning, and customization. Issues and pull requests are welcome!
