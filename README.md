# Spine Recovery Tracker

A Progressive Web App (PWA) built with Angular 19+ and TailwindCSS 4, packaged with Capacitor for native Android deployment. Functions entirely offline utilizing localized storage (Capacitor Filesystem / LocalStorage fallback).

## Features

- **Dashboard**: Summary metrics and charts mapping weight and pain progression.
- **Exercise Log**: Track daily routines (strength/cardio) with built-in templates and pain logs.
- **Diet Log**: Easily record daily meals.
- **Weight Tracker**: Monitor weight drops and BMI.
- **Food Reference**: Built-in library with basic macros + local custom entries.
- **Settings**: Manage goals, UI unit preferences, and backup data.
- **Offline First**: Zero dependency on a remote backend.

## Local Development (Testing on Web)

1. Ensure Node.js 22 is installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Angular dev server:
   ```bash
   npm start
   ```
4. Open the application in your browser (usually `http://localhost:4200`). UI is optimized for mobile views (open DevTools and switch to mobile view mode).

## Building for Android (APK)

To package the PWA as an Android native application using Capacitor, follow these instructions:

1. Build the production Angular app:
   ```bash
   npm run build
   ```
2. Sync the web code to the Capacitor native project:
   ```bash
   npx cap sync android
   ```
3. Open the Android project in Android Studio to build the APK:
   ```bash
   npx cap open android
   ```
4. In Android Studio, wait for Gradle sync to complete, then navigate to `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
   Alternatively, run from terminal if Android SDK is configured:
   ```bash
   cd android && ./gradlew assembleDebug
   ```
5. Install the generated `.apk` file located in `android/app/build/outputs/apk/debug/app-debug.apk` onto an Android device.

## Dependencies Included

- `@angular/core`: Next-gen web framework.
- `tailwindcss`: Utility-first CSS framework natively loaded.
- `ng2-charts` / `chart.js`: For dashboard progress visualization.
- `@capacitor/core`: Hybrid native bridge.
- `@capacitor/filesystem`: Handling offline data serialization storage.
- `@capacitor/local-notifications`: Scheduling daily logging reminders.
