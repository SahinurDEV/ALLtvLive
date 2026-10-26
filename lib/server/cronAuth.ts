/**
 * Who may run the cron job.
 * - With CRON_SECRET set: only `Authorization: Bearer <secret>` (Vercel sends it).
 * - Without it: Vercel Cron's own user agent is accepted, but the route then
 *   allows at most one run per FALLBACK_GAP_MS, so a spoofed request can do no
 *   more than the daily job would anyway.
 */
export const FALLBACK_GAP_MS = 20 * 60 * 60 * 1000;

export type CronAuth = "secret" | "fallback" | "denied";

export function cronAuth(headers: Headers, secret: string | undefined): CronAuth {
  if (secret) return headers.get("authorization") === `Bearer ${secret}` ? "secret" : "denied";
  return /^vercel-cron\//i.test(headers.get("user-agent") || "") ? "fallback" : "denied";
}
