"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, ScanLine, UtensilsCrossed, MoreHorizontal } from "lucide-react";

const LEFT_NAV = [
  { href: "/", label: "Start", icon: Home },
  { href: "/training", label: "Training", icon: Dumbbell },
];

const RIGHT_NAV = [
  { href: "/meals", label: "Mahlzeiten", icon: UtensilsCrossed },
  { href: "/settings", label: "Mehr", icon: MoreHorizontal },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-brand-100 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex items-stretch h-[58px]">
        {LEFT_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 flex-1"
          >
            <Icon size={22} className={isActive(href) ? "text-brand-600" : "text-gray-400"} />
            <span className={`text-[10px] font-medium ${isActive(href) ? "text-brand-700" : "text-gray-400"}`}>
              {label}
            </span>
          </Link>
        ))}

        {/* Scan-FAB in der Mitte */}
        <Link
          href="/scan"
          className="flex flex-col items-center justify-center flex-none w-16 -mt-3"
          aria-label="Scannen"
        >
          <span className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-brand-600 shadow-cardHover flex items-center justify-center text-white active:scale-95 transition-transform">
            <ScanLine size={24} />
          </span>
          <span className={`text-[10px] font-medium mt-0.5 ${isActive("/scan") ? "text-brand-700" : "text-gray-400"}`}>
            Scan
          </span>
        </Link>

        {RIGHT_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 flex-1"
          >
            <Icon size={22} className={isActive(href) ? "text-brand-600" : "text-gray-400"} />
            <span className={`text-[10px] font-medium ${isActive(href) ? "text-brand-700" : "text-gray-400"}`}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
