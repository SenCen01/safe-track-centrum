"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, MoreHorizontal, User as UserIcon } from "lucide-react";

// Responsive staff nav — sticky brand header + clustered links on desktop,
// fixed bottom tab bar + "More" sheet on mobile/tablet. Adapted from
// resolve-combat-next's StaffNav (sibling Centrum-family internal tool);
// see docs/design/centrum-brand.md.
//
// `icon` is a rendered element (e.g. `<LayoutDashboard size={16} />`), not a
// component reference — this is constructed in a Server Component
// (admin/dashboard layout.tsx), and a raw function/component reference
// can't cross the Server->Client Component boundary as prop data, only an
// already-rendered element can.

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export function StaffNav({
  navItems,
  homeHref,
  userName,
  onSignOut,
}: {
  navItems: NavItem[];
  homeHref: string;
  userName: string;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  function isActive(href: string) {
    const moreSpecificMatch = navItems.some(
      (n) => n.href !== href && n.href.startsWith(`${href}/`) && pathname.startsWith(n.href),
    );
    if (moreSpecificMatch) return false;
    return pathname.startsWith(href);
  }

  // Everything fits in the desktop row; on mobile the first three get a
  // permanent bottom-bar slot and the rest collapse into "More".
  const bottomPrimary = navItems.slice(0, 3);
  const bottomMore = navItems.slice(3);
  const moreActive = bottomMore.some((n) => isActive(n.href));

  return (
    <>
      <header className="sticky top-0 z-40 h-14 bg-brand shadow-sm">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:gap-6">
          <Link href={homeHref} className="flex shrink-0 items-center gap-2">
            <Image src="/images/logos/icon_logo.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="hidden font-[family-name:var(--font-display)] text-lg font-semibold text-white sm:inline">
              Safe Track Centrum
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {navItems.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  isActive(href) ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden shrink-0 items-center lg:flex">
            <div className="relative">
              <button
                onClick={() => setUserOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                  <UserIcon size={14} className="text-white" />
                </span>
                <span className="font-medium">{userName}</span>
                <ChevronDown size={14} className={`transition-transform ${userOpen ? "rotate-180" : ""}`} />
              </button>

              {userOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-black/10 bg-surface shadow-lg">
                    <button
                      onClick={onSignOut}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <span className="ml-auto max-w-[40%] truncate text-xs font-medium text-white/80 lg:hidden">{userName}</span>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-black/10 bg-surface lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {bottomPrimary.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              isActive(href) ? "text-brand" : "text-neutral-400"
            }`}
          >
            {icon}
            {label}
          </Link>
        ))}
        {bottomMore.length > 0 && (
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              moreOpen || moreActive ? "text-brand" : "text-neutral-400"
            }`}
          >
            <MoreHorizontal size={20} />
            More
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-14 overflow-hidden rounded-t-2xl bg-surface shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              {bottomMore.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(href) ? "bg-brand/10 text-brand" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {icon}
                  {label}
                </Link>
              ))}
            </div>
            <div className="border-t border-black/5 p-2">
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-brand/20 bg-brand/10">
                  <UserIcon size={14} className="text-brand" />
                </span>
                <span className="text-sm font-medium text-neutral-700">{userName}</span>
              </div>
              <button
                onClick={onSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
