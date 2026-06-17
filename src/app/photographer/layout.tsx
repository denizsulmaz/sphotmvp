"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Calendar, User, MessageSquare, LayoutDashboard, ChevronRight } from "lucide-react";

export default function PhotographerLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/photographer");
      } else if (role !== "photographer") {
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

  if (!user || role !== "photographer") {
    return null;
  }

  const navItems = [
    { name: "Dashboard", href: "/photographer/dashboard", icon: LayoutDashboard },
    { name: "Schedule Manager", href: "/photographer/schedule", icon: Calendar },
    { name: "Studio Profile", href: "/photographer/profile", icon: User },
    { name: "Messages", href: "/photographer/chat", icon: MessageSquare },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Role Specific Navigation */}
        <aside className="lg:col-span-3 bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
          <div className="mb-6 px-3">
            <h2 className="text-xl font-black text-foreground dark:text-white tracking-tight">Photographer Studio</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Manage bookings, schedule, and portfolio.</p>
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
                    <Icon size={18} className={isActive ? "text-black dark:text-white" : "text-gray-400 dark:text-zinc-500"} />
                    {item.name}
                  </span>
                  <ChevronRight size={14} className={isActive ? "text-black dark:text-white" : "text-gray-300 dark:text-zinc-700"} />
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Right Side: Main Portal Content Area */}
        <main className="lg:col-span-9 w-full min-h-[60vh]">
          {children}
        </main>
      </div>
    </div>
  );
}
