import { NextRequest, NextResponse } from "next/server";

const SCRAPER_UA = [
  /python-requests/i,
  /curl\//i,
  /wget\//i,
  /scrapy/i,
  /go-http-client/i,
  /httpx/i,
  /aiohttp/i,
  /libwww-perl/i,
  /nikto/i,
  /sqlmap/i,
  /masscan/i,
];

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";

  if (SCRAPER_UA.some((pattern) => pattern.test(ua))) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
