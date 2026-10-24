/**
 * Channels removed from ALLtvLive, e.g. after a rights-holder takedown request.
 *
 * Add the iptv-org channel id (as shown in the URL, e.g. `ExampleTV.us`)
 * with the date and a short reason. Blocked channels are hidden everywhere:
 * the catalog, search, channel pages and the public API.
 *
 * Keep this list in sync with the web copy in lib/blocklist.ts.
 */
export const BLOCKED_CHANNELS: Record<string, { date: string; reason: string }> = {
  // "ExampleTV.us": { date: "2026-10-24", reason: "DMCA request #123" },
};

export function isBlocked(channelId: string | null | undefined): boolean {
  return !!channelId && Object.prototype.hasOwnProperty.call(BLOCKED_CHANNELS, channelId);
}
