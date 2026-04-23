"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function NavLink({ href, children, className }: Props) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const base =
    "relative inline-flex items-center gap-1.5 transition after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:rounded-full";
  const state = active
    ? "text-white font-medium after:bg-white"
    : "text-white/60 hover:text-white after:bg-transparent";

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${base} ${state}${className ? ` ${className}` : ""}`}
    >
      {children}
    </Link>
  );
}
