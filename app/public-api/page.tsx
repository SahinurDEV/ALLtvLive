import type { Metadata } from "next";
import Link from "next/link";
import { Tv, Code2, Terminal, Clock, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Public API · ALLtvLive",
  description:
    "Read-only, cache-friendly HTTP endpoints for popular channels and live stream health status.",
};

export default function PublicApiPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-neon transition-colors mb-6"
        >
          <Tv className="h-4 w-4" />
          Back to ALLtvLive
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Public <span className="text-neon">API</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Cache-friendly, read-only JSON endpoints. No auth or API key required.
          Please be a good citizen — respect the cache headers, don&apos;t hammer
          the endpoints.
        </p>

        <section className="rounded-2xl border border-neon/30 bg-neon/[0.04] p-5 mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-neon">
            <Clock className="h-4 w-4" />
            Ground rules
          </div>
          <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>All endpoints return JSON with a top-level <code>source</code> field (<code>db</code> or <code>fallback</code>).</li>
            <li>Cache-Control tells you the freshness window — please honor it.</li>
            <li>Do not scrape or mirror the data. Link back to ALLtvLive instead.</li>
          </ul>
        </section>

        <ApiEndpoint
          method="GET"
          path="/api/public/top"
          title="Top channels"
          cache="s-maxage=60, stale-while-revalidate=300"
          description="Most-played channels aggregated from real viewer plays. Great for a leaderboard widget or a &lsquo;trending now&rsquo; row on your site."
          params={[
            { name: "rangeMs", value: "24h default · capped 30d", desc: "Look-back window in milliseconds" },
            { name: "limit", value: "20 default · max 100", desc: "How many rows to return" },
          ]}
          example={`curl https://alltvlive.example.com/api/public/top?rangeMs=86400000&limit=10`}
          shape={`{
  "channels": [
    {
      "channelId": "AlJazeeraEnglish.qa",
      "channelName": "Al Jazeera English",
      "plays": 214,
      "uniqueIps": 138,
      "lastPlayedAt": 1728820193000
    }
  ],
  "source": "db"
}`}
        />

        <ApiEndpoint
          method="GET"
          path="/api/public/health"
          title="Live stream health"
          cache="s-maxage=30, stale-while-revalidate=120"
          description="Rolling success and failure counters per channel, aggregated across every viewer. Use it to surface a red / yellow / green dot on your own channel list."
          example={`curl https://alltvlive.example.com/api/public/health`}
          shape={`{
  "channels": [
    {
      "channelId": "SkyNews.uk",
      "channelName": "Sky News",
      "status": "healthy",
      "failureRate": 0.02,
      "successes": 812,
      "failures": 17,
      "lastSuccessAt": 1728820193000,
      "lastFailureAt": 1728800001000
    }
  ],
  "source": "db"
}`}
        />

        <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            Have questions? Open an issue on{" "}
            <a
              href="https://github.com/devSahinur/ALLtvLive"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon hover:underline inline-flex items-center gap-1"
            >
              GitHub <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function ApiEndpoint({
  method,
  path,
  title,
  description,
  cache,
  params,
  example,
  shape,
}: {
  method: string;
  path: string;
  title: string;
  description: string;
  cache: string;
  params?: Array<{ name: string; value: string; desc: string }>;
  example: string;
  shape: string;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono font-bold text-neon bg-neon/10 border border-neon/30 rounded px-1.5 py-0.5">
          {method}
        </span>
        <code className="text-sm font-mono text-foreground">{path}</code>
      </div>
      <h2 className="text-lg font-semibold mt-1">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>

      <p className="text-[11px] text-muted-foreground mt-3 font-mono">
        <span className="text-neon">Cache-Control:</span> {cache}
      </p>

      {params && params.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
            Query parameters
          </p>
          <ul className="space-y-1.5 text-xs">
            {params.map((p) => (
              <li key={p.name} className="flex flex-wrap items-baseline gap-2">
                <code className="font-mono text-foreground">{p.name}</code>
                <span className="text-muted-foreground text-[11px]">
                  {p.value}
                </span>
                <span className="text-muted-foreground">— {p.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
          <Terminal className="h-3 w-3" />
          Example request
        </p>
        <pre className="text-[11px] font-mono bg-background/60 border border-border/60 rounded-lg px-3 py-2 overflow-x-auto">
          {example}
        </pre>
      </div>

      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
          <Code2 className="h-3 w-3" />
          Response shape
        </p>
        <pre className="text-[11px] font-mono bg-background/60 border border-border/60 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre">
          {shape}
        </pre>
      </div>
    </section>
  );
}
