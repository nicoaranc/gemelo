import { NextRequest, NextResponse } from "next/server";
import { COOKIE, validSession } from "./lib/auth";

export async function middleware(req: NextRequest) {
  if (await validSession(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ detail: "sesión requerida" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/demo/:path*", "/panel/:path*", "/runs/:path*", "/api/gemelo/:path*"] };
