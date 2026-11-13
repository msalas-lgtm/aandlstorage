import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, TENANT_COOKIE, readToken, tenantSecret, verifyToken } from "@/lib/admin/token";

// Asks Supabase whether the post exists (one tiny request, never cached) so deleted or unknown posts get a real 404.
async function blogSlugExists(slug: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return true;
  try {
    const response = await fetch(
      `${url}/rest/v1/blog_posts?select=slug&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!response.ok) return true; // if the lookup fails, let the page decide
    return ((await response.json()) as unknown[]).length > 0;
  } catch {
    return true;
  }
}

const TENANT_PAGES = ["/account", "/dashboard", "/statement", "/billing_accounts", "/edit_profile", "/rentals"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Unknown or deleted blog posts get a real 404 (not a streamed "soft 404").
  if (pathname.startsWith("/blog/")) {
    let slug = pathname.slice("/blog/".length);
    try {
      slug = decodeURIComponent(slug);
    } catch {
      // keep the raw value
    }
    if (!(await blogSlugExists(slug))) {
      return NextResponse.rewrite(new URL("/blog/__not-found__/missing", request.url));
    }
    return NextResponse.next();
  }

  // The customer pages need a tenant session (each page checks again against the database).
  if (TENANT_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))) {
    const sub = readToken(request.cookies.get(TENANT_COOKIE)?.value, tenantSecret(process.env.ADMIN_SECRET));
    return sub?.startsWith("tenant:") ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
  }

  // Keeps every /admin page behind the login. Server actions check the session again.
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifyToken(token, process.env.ADMIN_SECRET)) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  if (pathname !== "/admin") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/blog/:slug+",
    "/account",
    "/dashboard",
    "/statement/:path*",
    "/statement",
    "/billing_accounts",
    "/edit_profile/:path*",
    "/edit_profile",
    "/rentals",
  ],
};
