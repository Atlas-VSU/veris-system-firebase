
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/"];
const basicRoutes = ["/org-dashboard", "/org-events", "/org-members"];
const plusRoutes = [ "/org-fines", "/org-fees", "/org-payments", "/org-clearance"]
 

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("session")?.value || null;
  const userRole = request.cookies.get("userRole")?.value || null;
  const subscriptionTier = request.cookies.get("subscriptionTier")?.value || null;
  const isAuthenticated = !!token;

  if(isAuthenticated && publicRoutes.includes(pathname)) {
     return NextResponse.redirect(new URL("/org-dashboard", request.url));
  }
  
const isMaintenance = process.env.MAINTENANCE_MODE === "true";

  // redirect to maintenance page if in maintenance mode and not already on it
  if (isMaintenance && pathname !== "/maintenance") {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }


  // prevent access to maintenance page when not in maintenance mode
  if (!isMaintenance && pathname === "/maintenance") {
  return NextResponse.redirect(new URL("/", request.url));
}

  const isBasicRoute = basicRoutes.some((route) => pathname.startsWith(route));
  const isPlusRoute = plusRoutes.some((route) => pathname.startsWith(route));
  
  if (!isAuthenticated &&(isBasicRoute || isPlusRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isPlusRoute && subscriptionTier !== "plus") {
    return NextResponse.redirect(new URL("/subscription-required", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};