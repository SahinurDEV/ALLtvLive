// Fallback used when MongoDB is unreachable. Live source of truth is the
// `featuredChannels` collection, managed via the admin dashboard at /admin.
// IDs match iptv-org channel IDs (see https://iptv-org.github.io/api/channels.json).

export const FEATURED_CHANNEL_IDS: string[] = [
  "AlJazeeraEnglish.qa",
  "BBCNewsHD.uk",
  "DWEnglish.de",
  "France24English.fr",
  "CNBCEurope.us",
  "Bloomberg.us",
  "EuroNewsEnglish.fr",
  "NASATV.us",
  "SkyNewsInternational.uk",
  "CBSNews.us",
];

// A specific channel ID that always auto-plays first when set.
// null means "pick randomly from FEATURED_CHANNEL_IDS instead".
export const PRIMARY_CHANNEL_ID: string | null = null;

export function isFeatured(channelId: string): boolean {
  return FEATURED_CHANNEL_IDS.includes(channelId);
}
