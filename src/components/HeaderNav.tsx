"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export default function HeaderNav() {
  const { user, role, signOut, loading } = useAuth();
  const { t } = useLanguage();
  const unreadCount = useUnreadMessages();

  const getDashboardLink = () => {
    if (role === "admin") return "/admin/dashboard";
    if (role === "photographer") return "/photographer/dashboard";
    return "/client/dashboard";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 shadow-sm dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-tighter text-foreground dark:text-white">
          SPHOT<span className="text-accent">.</span>
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          <Link href="/blog" className="text-sm font-bold text-gray-600 dark:text-zinc-400 hover:text-foreground dark:hover:text-white transition-colors hidden md:block">
            Blog
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            <div id="nav-filter-slot" />
          </div>

          <div className="border-l border-gray-200 dark:border-zinc-800 pl-3 flex items-center">
            {loading ? (
              <span className="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={getDashboardLink()}
                    className="relative flex items-center gap-1 text-sm font-bold bg-gray-100 dark:bg-zinc-800 text-foreground dark:text-white px-3 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <UserIcon size={14} />
                    <span className="hidden sm:inline">
                      {role === "admin" ? "Admin" : role === "photographer" ? "Studio" : "Account"}
                    </span>
                    {unreadCount > 0 && (
                      <span
                        aria-label={`${unreadCount} unread conversations`}
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-black"
                      />
                    )}
                  </Link>
                  <button
                    onClick={signOut}
                    title="Sign Out"
                    aria-label="Sign Out"
                    className="p-2 text-gray-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center gap-1.5 text-sm font-bold bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  <LogIn size={14} />
                  <span>{t ? t("signIn") || "Sign In" : "Sign In"}</span>
                </Link>
              )}
          </div>
        </div>
      </div>
    </header>
  );
}
