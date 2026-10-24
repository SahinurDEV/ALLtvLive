export interface M3UEntry {
  name: string;
  url: string;
  logo: string | null;
  group: string | null;
}

function attr(line: string, key: string): string | null {
  const m = line.match(new RegExp(`${key}="([^"]*)"`, "i"));
  return m && m[1].trim() ? m[1].trim() : null;
}

/** Parse an extended M3U playlist (#EXTM3U / #EXTINF) into entries. */
export function parseM3U(text: string): M3UEntry[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const out: M3UEntry[] = [];
  let pending: Omit<M3UEntry, "url"> | null = null;
  for (const line of lines) {
    if (!line) continue;
    if (line.toUpperCase().startsWith("#EXTINF")) {
      const comma = line.lastIndexOf(",");
      const title = comma >= 0 ? line.slice(comma + 1).trim() : "";
      pending = {
        name: title || attr(line, "tvg-name") || "Untitled",
        logo: attr(line, "tvg-logo"),
        group: attr(line, "group-title"),
      };
      continue;
    }
    if (line.startsWith("#")) continue;
    if (!/^https?:\/\//i.test(line)) {
      pending = null;
      continue;
    }
    out.push({
      name: pending?.name || line.split("/").pop() || "Untitled",
      url: line,
      logo: pending?.logo ?? null,
      group: pending?.group ?? null,
    });
    pending = null;
  }
  return out;
}
