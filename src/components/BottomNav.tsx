"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, UtensilsCrossed, Trophy, Dumbbell, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Start", icon: Home },
  { href: "/meals", label: "Mahlzeiten", icon: UtensilsCrossed },
  { href: "/meals/scan", label: "Scan", icon: ScanLine, isCta: true },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/challenges", label: "Challenges", icon: Trophy },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-brand-100 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isCta }) => {
          const active = pathname === href;
          if (isCta) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center -translate-y-4"
              >
                <span className="w-14 h-14 rounded-full bg-brand-600 shadow-cardHover flex items-center justify-center text-white active:scale-95 transition-transform">
                  <Icon size={26} />
                </span>
                <span className="text-[11px] font-medium text-brand-700 mt-1">{label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 py-2 px-2 flex-1"
            >
              <Icon size={22} className={active ? "text-brand-600" : "text-gray-400"} />
              <span
                className={`text-[11px] font-medium ${
                  active ? "text-brand-700" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
        <Link
          href="/settings"
          className="flex flex-col items-center justify-center gap-1 py-2 px-2 flex-1"
        >
          <Settings size={22} className={pathname === "/settings" ? "text-brand-600" : "text-gray-400"} />
          <span
            className={`text-[11px] font-medium ${
              pathname === "/settings" ? "text-brand-700" : "text-gray-400"
            }`}
          >
            Mehr
          </span>
        </Link>
      </div>
    </nav>
  );
}
