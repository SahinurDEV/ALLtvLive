import { ImageResponse } from "next/og";
import { getCatalog } from "@/lib/server/catalog";

export const runtime = "nodejs";
export const revalidate = 86400;

/** 1200x630 share card for a channel: logo, name, country and categories. */
export async function GET(_req: Request, { params }: { params: Promise<{ channel: string }> }) {
  const id = decodeURIComponent((await params).channel);
  let name = "Live TV";
  let sub = "Free live TV from around the world";
  let logo: string | null = null;
  try {
    const ch = (await getCatalog()).get(id);
    if (ch) {
      name = ch.name;
      sub = [ch.country, ...ch.categories.slice(0, 2)].filter(Boolean).join(" · ");
      logo = ch.logo;
    }
  } catch {
    // generic card
  }
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 60,
          background: "linear-gradient(135deg, #050510 0%, #0a1a1e 60%, #003322 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, color: "#00ff9d", fontWeight: 700 }}>
          ALLtvLive
          <div style={{ display: "flex", fontSize: 24, background: "#dc2626", color: "white", padding: "4px 14px", borderRadius: 999 }}>
            LIVE
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={260} height={260} style={{ objectFit: "contain", background: "rgba(255,255,255,0.06)", borderRadius: 32, padding: 20 }} alt="" />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
            <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{name}</div>
            <div style={{ fontSize: 32, color: "#a1a1aa" }}>{sub}</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#d4d4d8" }}>Watch free, no signup · alltvlive</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=86400, s-maxage=86400" } }
  );
}
