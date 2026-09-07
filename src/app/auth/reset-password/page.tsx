"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Landing page for password-recovery links.
 * Handles all the shapes a Supabase recovery link can arrive in:
 *  - ?code=...            (PKCE flow, started from our "Forgot password?" link)
 *  - ?token_hash=...      (admin-generated / template links)
 *  - #access_token=...    (implicit verify redirect)
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;

    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setChecking(false);
      }
    });

    const establishSession = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (code) {
          const { error: exErr } = await sb.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        } else if (tokenHash) {
          const { error: otpErr } = await sb.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (otpErr) throw otpErr;
        } else if (accessToken && refreshToken) {
          const { error: sesErr } = await sb.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sesErr) throw sesErr;
        } else {
          const { data } = await sb.auth.getSession();
          if (!data.session) {
            setError(
              "This reset link is invalid or has expired. Please request a new one from the sign-in page."
            );
          } else {
            setReady(true);
          }
          setChecking(false);
          return;
        }
        setReady(true);
      } catch {
        setError(
          "This reset link is invalid or has expired. Please request a new one from the sign-in page."
        );
      } finally {
        setChecking(false);
      }
    };

    establishSession();
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push("/auth/photographer"), 2500);
    } catch (err: any) {
      setError(err.message || "Could not update the password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-none">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black tracking-tight text-foreground dark:text-white flex items-center justify-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
              <Lock size={16} />
            </span>
            <span>Set a New Password</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
            Choose a new password for your SPHOT account.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 p-4 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2 font-bold mb-4">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {done ? (
          <div className="bg-green-500/10 border border-green-500 p-4 rounded-xl text-xs text-green-700 dark:text-green-400 flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Password updated! Redirecting you to sign in…</span>
          </div>
        ) : checking ? (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-gray-300 dark:border-zinc-700 border-t-black dark:border-t-white rounded-full animate-spin" />
          </div>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-12 text-sm outline-none focus:border-black dark:focus:border-white transition-all text-foreground dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Confirm New Password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-black dark:focus:border-white transition-all text-foreground dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        ) : (
          <p className="text-center text-sm text-gray-500 dark:text-zinc-400">
            Request a new reset link from the{" "}
            <a href="/auth/photographer" className="underline font-bold text-foreground dark:text-white">
              sign-in page
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
