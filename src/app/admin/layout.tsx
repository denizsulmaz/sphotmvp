"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Camera, BarChart3, Flag, MessageSquare, LogOut, Users, Aperture, Bug } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Approvals", icon: Camera, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/sphoters", label: "Sphoters", icon: Aperture },
  { href: "/admin/operations", label: "Operations", icon: BarChart3 },
  { href: "/admin/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/errors", label: "Errors", icon: Bug },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // The login page renders without the admin chrome or guard.
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    if (!loading) {
      if (!user || (role !== null && role !== "admin")) {
        router.replace("/admin/login");
      }
    }
  }, [isLoginPage, user, role, loading, router]);

  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (role !== null && role !== "admin")) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
      <div className="space-y-6">
        {/* Top Admin Bar */}
        <header className="bg-zinc-950 text-white rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl">
              <ShieldCheck size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Admin Console</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Sphot platform moderation, approvals & operations.</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl transition-colors self-start sm:self-auto"
          >
            <LogOut size={14} /> Sign out
          </button>
        </header>

        {/* Tab nav */}
        <nav className="flex gap-2 overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  active
                    ? "bg-black dark:bg-white text-white dark:text-black border-transparent"
                    : "bg-white dark:bg-zinc-950 text-gray-600 dark:text-zinc-400 border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Content area */}
        <main className="min-h-[60vh]">{children}</main>
      </div>
    </div>
  );
}
