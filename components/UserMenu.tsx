"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";

// Account menu in the top-right: the user's name is the trigger; clicking it
// drops down a small menu with Profile, Settings, and Log out. Closes on outside
// click or Escape. Client component because the open/closed state and the
// listeners need to live in the browser.
export function UserMenu({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 text-white/60 hover:text-white transition"
      >
        <span className="max-w-[8rem] truncate">{displayName}</span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-white/10 bg-navy shadow-xl py-1 z-50"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition"
          >
            Profile
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition"
          >
            Settings
          </Link>
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition"
            >
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
