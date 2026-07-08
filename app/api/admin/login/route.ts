import { NextResponse } from "next/server";
import { checkPassword, issueSessionCookie } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 }
    );
  }

  await issueSessionCookie();
  return NextResponse.json({ ok: true });
}
