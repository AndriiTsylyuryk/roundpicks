import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host.includes("vercel.app")) {
    const url = new URL(req.url);
    return NextResponse.redirect(
      `https://roundpicks.com${url.pathname}${url.search}`,
      308,
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
