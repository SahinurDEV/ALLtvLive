import { NextResponse } from "next/server";
import { checkPassword, issueSessionCookie } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { checkRateLimit } from "@/lib/admin/rateLimit";
import { extractIp } from "@/lib/admin/ipUtils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = extractIp(req);
  const rl = await checkRateLimit(`admin-login:${ip}`, 8, 5 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(rl.retryAfter / 1000).toString() } }
    );
  }

  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (typeof body.password !== "string") {
    return NextResponse.json(
      { ok: false, error: "missing_password" },
      { status: 400 }
    );
  }

  if (!checkPassword(body.password)) {
    await logAudit(req, "admin.login.fail");
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 }
    );
  }

  await issueSessionCookie();
  await logAudit(req, "admin.login.success");
  return NextResponse.json({ ok: true });
}
