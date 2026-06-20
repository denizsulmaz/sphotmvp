"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already-authenticated admins skip straight in.
  useEffect(() => {
    if (!authLoading && user && role === "admin") {
      router.replace("/admin");
    }
  }, [authLoading, user, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Service is not configured.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      // Verify admin role before routing; race a timeout so we never hang.
      const roleQuery = supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user!.id)
        .single()
        .then(({ data: p }) => p?.role as string | undefined);
      const r = await Promise.race([
        roleQuery,
        new Promise<undefined>((res) => setTimeout(() => res(undefined), 2500)),
      ]);
      if (r !== "admin") {
        await supabase.auth.signOut();
        setError("This account is not an administrator.");
        setLoading(false);
        return;
      }
      router.replace("/admin");
    } catch (err: any) {
      setError(err.message || "Sign in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-black dark:bg-zinc-900 flex items-center justify-center text-accent mb-4">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground dark:text-white">Admin Console</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Restricted access — administrators only.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold mb-4">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
            <input
              type="email"
              required
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
            <input
              type={showPw ? "text" : "password"}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-10 text-sm outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-3 top-3 text-gray-400 hover:text-foreground dark:hover:text-white"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black font-black rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center"
          >
            {loading ? <span className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" /> : "Enter Console"}
          </button>
        </form>
      </div>
    </div>
  );
}
