"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import Link from "next/link";
import { Calendar, MessageSquare, LayoutDashboard, ChevronRight } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const unread = useUnreadMessages();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth");
      } else if (role !== null && role !== "client") {
        router.push("/");
      }
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (role !== null && role !== "client")) {
    return null;
  }

  const navItems = [
    { name: "My Reservations", href: "/client/dashboard", icon: LayoutDashboard },
    { name: "Chat Box", href: "/client/chat", icon: MessageSquare },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
          <div className="mb-6 px-3">
            <h2 className="text-xl font-black text-foreground dark:text-white tracking-tight">My Account</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Manage bookings and chat with studios.</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${
                    isActive
                      ? "bg-accent/15 border border-accent/30 text-black dark:text-white"
                      : "text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="relative">
                      <Icon size={18} className={isActive ? "text-black dark:text-white" : "text-gray-400 dark:text-zinc-500"} />
                      {item.href.endsWith("/chat") && unread.count > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-zinc-950" />
                      )}
                    </span>
                    {item.name}
                  </span>
                  <ChevronRight size={14} className={isActive ? "text-black dark:text-white" : "text-gray-300 dark:text-zinc-700"} />
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Viewport */}
        <main className="lg:col-span-9 w-full min-h-[60vh]">
          {children}
        </main>
      </div>
    </div>
  );
}
