import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/admin/login", "/api/doctors"];
const COOKIE_NAME = "tcm_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|ico|css)$/)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify<{ role?: string }>(token, JWT_SECRET);
    const role = payload.role;

    const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
    const isPharmacyPath = pathname.startsWith("/pharmacy") || pathname.startsWith("/api/pharmacy");
    const isSharedApi = pathname === "/api/auth/me" || pathname === "/api/auth/logout";
    const isDoctorApi = pathname === "/api/doctors";

    // ADMIN users can only access admin paths and shared APIs
    if (role === "ADMIN" && !isAdminPath && !isSharedApi) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // PHARMACY users can only access pharmacy paths and shared APIs
    if (role === "PHARMACY" && !isPharmacyPath && !isSharedApi && !isDoctorApi) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/pharmacy/dashboard", request.url));
    }

    // DOCTOR users cannot access admin or pharmacy paths
    if (role === "DOCTOR" && (isAdminPath || isPharmacyPath)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Non-ADMIN users cannot access admin paths
    if (role !== "ADMIN" && isAdminPath) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
