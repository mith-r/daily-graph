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
    "inline-flex items-center gap-1.5 border-b-2 pb-0.5 transition";
  const state = active
    ? "text-white font-medium border-white"
    : "text-white/60 hover:text-white border-transparent";

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
