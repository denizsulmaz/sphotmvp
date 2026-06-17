"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth");
      } else if (role !== "admin") {
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

  if (!user || role !== "admin") {
    return null;
  }

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
              <p className="text-xs text-zinc-400 mt-0.5">Sphot platform moderation and approvals.</p>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="min-h-[60vh]">
          {children}
        </main>
      </div>
    </div>
  );
}
