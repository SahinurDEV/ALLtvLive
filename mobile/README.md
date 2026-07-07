# ALLtvLive Mobile (Expo)

React Native + Expo Router port of the ALLtvLive web app. Uses the same iptv-org channel data as the web version.

## Requirements

- Node 20+
- Xcode (for iOS simulator) or Android Studio (for Android emulator)
- Expo Go app on your phone (fastest way to try it live)

## First-time setup

```bash
cd mobile
npm install
npx expo start
```

Then either:
- Press **i** to open iOS simulator
- Press **a** to open Android emulator
- Scan the QR code with **Expo Go** on your phone

## What's included

- **Home tab** — searchable channel grid pulled from `iptv-org.github.io/api`
- **Favorites tab** — persisted with AsyncStorage
- **My Channels tab** — add your own HLS/MP4/YouTube live URLs, including one-tap FIFA/Al Jazeera/DW/NASA presets
- **Player screen** — HLS playback via `expo-video` with fullscreen + PiP; automatically marks channels broken if they fail to load
- Dark theme matching the web app's neon accent

## Notes

- YouTube live URLs aren't natively supported by `expo-video`. To make YouTube presets work end-to-end, either swap to `react-native-webview` for those or resolve them to a direct HLS variant.
- `expo-video` is the newer replacement for `expo-av`. It requires Expo SDK 52+.
- New Architecture is enabled via `newArchEnabled: true` in `app.json`.
