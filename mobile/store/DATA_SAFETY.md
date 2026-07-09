# Google Play — Data Safety form answers (ALLtvLive)

Fill these into Play Console → App content → **Data safety**. These reflect the
mobile app as built (no ads, no analytics, no accounts, on‑device storage only).

## Overview questions

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (all network calls use HTTPS) |
| Do you provide a way for users to request that their data is deleted? | **Yes** — data is only on‑device; uninstalling or clearing storage deletes it. State this in the listing. |

> Because the app collects **no** user data (favorites/history/settings never
> leave the device, and there are no ads/analytics/accounts), you can legitimately
> select **"No data collected"**. Do **not** over‑declare — only declare what is
> actually collected/transmitted.

## If Play asks about specific categories, the honest answers are:

- **Location:** Not collected. (The app does **not** request device location
  permission; channel country comes from the catalog metadata.)
- **Personal info / email / name:** Not collected (no accounts).
- **App activity / analytics:** Not collected (no analytics SDK).
- **Device or other IDs / advertising ID:** Not collected (no ads SDK).
- **Files/media, contacts, messages, calendar, health:** Not accessed.

## Permissions declared in the build

- `INTERNET` — required to stream video and fetch the channel list.
- Explicitly **blocked**: fine/coarse location, microphone, camera (see
  `app.json` → `android.blockedPermissions`).

## Ads declaration (App content → Ads)

- **Contains ads: No** (the mobile app ships without advertising SDKs).

## Target audience & content

- Target age: **not** directed at children; select a general/mature‑appropriate
  audience.
- Content rating questionnaire: answer honestly. The app filters `is_nsfw`
  channels out of the catalog. Live news/entertainment → typically **Teen**.
