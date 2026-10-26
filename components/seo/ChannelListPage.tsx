import Link from "next/link";
import type { CatalogChannel } from "@/lib/server/catalog";
import { LandingHeading } from "./LandingHeading";

/** Server-rendered, crawlable list of channels linking to each channel page. */
export function ChannelListPage({
  kind,
  name,
  channels,
  jsonLd,
}: {
  kind: "country" | "category";
  name: string;
  channels: CatalogChannel[];
  jsonLd: object;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <nav className="text-sm">
          <Link href="/watch" className="text-neon hover:underline">ALLtvLive</Link>
        </nav>
        <LandingHeading kind={kind} name={name} count={channels.length} />
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {channels.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${encodeURIComponent(c.id)}`}
                className="flex items-center gap-3 min-h-12 rounded-lg border border-border/50 px-3 py-2 hover:border-neon/50"
              >
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo} alt="" width={40} height={40} loading="lazy" className="w-10 h-10 object-contain shrink-0" />
                ) : (
                  <span className="w-10 h-10 shrink-0 rounded bg-secondary" aria-hidden />
                )}
                <span className="min-w-0 truncate text-sm font-medium">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
