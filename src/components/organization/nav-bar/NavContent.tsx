"use client";

import Link from "next/link";
import Image from "next/image";

import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import ConfirmationDialog from "@/features/organization/members/components/ConfirmationDialog";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebase.config";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { cacheUtils } from "@/utils/cacheUtils";
import { User } from "./AdminSidebar";
import { Organization } from "@/constants/types";


interface NavContentProps {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  user?: User;
  isAuthenticated?: boolean;
  navItems?: NavItem[];
  organization?: Organization
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function NavContent({
  pathname,
  collapsed = false,
  onNavigate,
  user,
  isAuthenticated,
  navItems,
  organization
}: NavContentProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActiveHref = (href: string, pathname: string) => {
    return href === "/org-dashboard" ? pathname === "/org-dashboard" : pathname.startsWith(href);
  };


  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  const handleSignout = async () => {
    try {
      setIsLoggingOut(true);

      // Set global signing out state first
      cacheUtils.setSigningOut(true);

      // Use centralized cache clearing utility
      cacheUtils.clearOnLogout();

      // Run Firebase signout and session cookie clear in parallel
      const [, sessionResponse] = await Promise.allSettled([
        signOut(auth),
        fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
        }),
      ]);

      if (sessionResponse.status === "fulfilled" && !sessionResponse.value.ok) {
        console.warn(
          "API signout encountered an issue, continuing logout process",
        );
      }

      // Use a reload approach for a clean slate
      window.location.href = "/?logout=true";
    } catch (error) {
      console.error("Error signing out:", error);

      // Even if there's an error with signOut, still try to clear caches
      cacheUtils.clearOnLogout();

      // And still redirect to the login page
      window.location.href = "/?logout=true";
    }
  };

  

  return (
    <TooltipProvider delayDuration={200}>
      {isLoggingOut && (
        <LoadingScreen message="Signing out..." className="rounded-none" />
      )}
      <div className="flex h-full flex-col overflow-hidden">
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-5 shrink-0",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden border border-primary/20">
            {organization?.orgLogoUrl ? (
              <img
                src={organization.orgLogoUrl}
                alt={organization?.shortName?.toUpperCase() || "Logo"}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-primary"
              >
                <path d="M4 4l8 16 8-16M8 4l4 8 4-8" />
              </svg>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-none tracking-wide bg-linear-to-r from-primary via-[#4E5D44] to-[#3B4734] bg-clip-text text-transparent font-serif">
                VERIS
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                  Admin
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-[#DED8CF]/50 shrink-0" />

        {/* Nav */}
        <nav
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4"
          aria-label="Main navigation"
        >
          {(navItems ?? []).map((item) => {
            const active = isActiveHref(item.href, pathname);
            const linkEl = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  collapsed && "justify-center px-0 size-10 mx-auto",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-primary/8 hover:text-primary",
                )}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.75 rounded-full bg-secondary" />
                )}
                <item.icon
                  className={cn("size-4 shrink-0", active && "text-primary-foreground")}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkEl;
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0">
          <Separator className="bg-[#E0E0E0]" />
          <div
            className={cn(
              "flex flex-col gap-1 px-3 py-3",
              collapsed && "items-center px-0",
            )}
          >
            {/* User info */}
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5",
                !collapsed && "hover:bg-[#F0EBE5] transition-colors",
              )}
            >
              <Avatar className="size-7 shrink-0 border border-primary/20">
              {organization?.orgLogoUrl ? (
                <img src={organization?.orgLogoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {organization?.shortName?.toUpperCase() || initials}
                </AvatarFallback>
              )}
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {user?.name ?? "Admin User"}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {user?.email ?? ""}
                  </p>
                </div>
              )}
            </div>
            {/* Sign out */}
            {collapsed ? (
              <Tooltip>
                <ConfirmationDialog
                  title="Sign out?"
                  description="You will be signed out of your account and redirected to the home page."
                  confirmLabel="Sign Out"
                  onConfirm={handleSignout}
                  trigger={
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Sign out"
                      >
                        <LogOut className="size-4" />
                      </Button>
                    </TooltipTrigger>
                  }
                />
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            ) : (
              <ConfirmationDialog
                title="Sign out?"
                description="You will be signed out of your account and redirected to the home page."
                confirmLabel="Sign Out"
                onConfirm={handleSignout}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
