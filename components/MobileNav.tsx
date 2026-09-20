"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import type { SessionUser } from "@/lib/types";

export function MobileNav({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-navy-900/10 p-2"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="h-full">
            <Sidebar user={user} />
          </div>
          <button className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 rounded-full bg-white p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
