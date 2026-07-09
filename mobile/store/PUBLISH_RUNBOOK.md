# ALLtvLive — Play Store publish runbook

Everything below runs from the `mobile/` folder. You already have a Play Console
account, so this covers build → upload → release.

## 0. One-time setup
```bash
cd mobile
npm install -g eas-cli          # already installed: eas-cli 16.17.4
eas login                       # log in to your Expo account
eas init                        # creates the EAS project + writes extra.eas.projectId into app.json
```

## 1. Sanity check the config
- `app.json` → `android.package` = `com.alltvlive.app`, `versionCode` = 1  ✅
- Icons/splash exist in `assets/` (icon, adaptive-icon, splash, favicon)  ✅
- Privacy policy is live at **https://livetv.sahinur.dev/privacy**  ✅
- Point the app at the production API (already default):
  `lib/config.ts` → `https://livetv.sahinur.dev`  ✅

## 2. Build the Android App Bundle (.aab)
```bash
eas build -p android --profile production
```
- EAS will offer to **generate a new Android Keystore** — say **yes** and let EAS
  manage it (this is your app signing key; never lose it).
- When it finishes, download the `.aab` from the build URL EAS prints.

Want a quick installable test build first? Use the preview profile (APK):
```bash
eas build -p android --profile preview
```

## 3. Create the app in Play Console
1. Play Console → **Create app** → name **ALLtvLive**, app, free.
2. Complete **App content**:
   - **Privacy policy**: `https://livetv.sahinur.dev/privacy`
   - **Data safety**: use `store/DATA_SAFETY.md` → answer **No data collected**.
   - **Ads**: **No** (app ships without ads).
   - **Content rating**: fill the questionnaire honestly (news/entertainment → Teen).
   - **Target audience**: not directed at children.
3. **Store listing**: paste text + graphics from `store/STORE_LISTING.md`,
   `store/playstore-icon.png` (512), `store/feature-graphic.png` (1024×500),
   and 2–8 phone screenshots (capture from the running app).

## 4. Upload the build & release
Manual:
1. Play Console → **Testing → Internal testing → Create release**.
2. Upload the `.aab`, add release notes, review, **roll out to Internal testing**.
3. Add your email as a tester, install via the opt-in link, verify.
4. When happy: promote to **Closed → Open → Production**.

Automated submit (optional): create a Google Play **service account** JSON with
"Release" permission, save it as `mobile/play-service-account.json` (git-ignored),
then:
```bash
eas submit -p android --profile production --latest
```

## 5. Future updates
- Bump nothing manually — `eas.json` `production` profile has `autoIncrement`,
  so each `eas build` raises `versionCode`. Bump the human-facing `version`
  string in `app.json` when you want (e.g. 1.0.1).
- Rebuild → upload → roll out.

## ⚠️ Keep-it-alive checklist (policy)
- Curate featured/broadcast channels to **legitimate free-to-air / official**
  streams — this is the main takedown risk for live-TV apps.
- Keep broadcaster names/logos out of the **icon, title, feature graphic**.
- Keep the in-app **About/Disclaimer** screen (copyright notice + report path)
  and a monitored **dmca@livetv.sahinur.dev** inbox.
- Respond to any Google policy email within the deadline they give.

## Files created for you
- `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png`, `assets/favicon.png`
- `store/playstore-icon.png` (512), `store/feature-graphic.png` (1024×500)
- `eas.json`, updated `app.json`
- `store/STORE_LISTING.md`, `store/DATA_SAFETY.md`, this runbook
- Web privacy page: `app/privacy/page.tsx` → `/privacy`
- In-app About screen: `app/about.tsx` (linked from the Home tab ⓘ)
