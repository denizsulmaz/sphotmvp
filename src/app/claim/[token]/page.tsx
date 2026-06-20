"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Camera, Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ClaimPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;
  const [state, setState] = useState<"loading" | "valid" | "invalid" | "done">("loading");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/claim?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid invite.");
          setState("invalid");
          return;
        }
        setEmail(data.email);
        setName(data.name);
        setState("valid");
      } catch {
        setError("Could not load invite.");
        setState("invalid");
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not complete claim.");
        setSubmitting(false);
        return;
      }
      // Sign in with the new credentials.
      if (supabase) {
        await supabase.auth.signInWithPassword({ email: data.email, password });
      }
      setState("done");
      setTimeout(() => router.replace("/photographer/profile"), 1200);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black dark:bg-zinc-900 flex items-center justify-center text-accent mb-4">
            <Camera size={26} />
          </div>
          <h1 className="text-2xl font-black text-foreground dark:text-white">Claim your profile</h1>
        </div>

        {state === "loading" && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {state === "invalid" && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {state === "done" && (
          <div className="flex flex-col items-center gap-2 text-center py-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
            <p className="font-black text-foreground dark:text-white">Profile claimed!</p>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Taking you to your dashboard…</p>
          </div>
        )}

        {state === "valid" && (
          <>
            <p className="text-sm text-gray-500 dark:text-zinc-400 text-center mb-6">
              {name ? <><span className="font-bold text-foreground dark:text-white">{name}</span> — </> : null}
              set a password for <span className="font-bold text-foreground dark:text-white">{email}</span> to take ownership of your SPHOT profile.
            </p>
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold mb-4">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Create a password"
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
                disabled={submitting}
                className="w-full py-3.5 bg-accent text-black font-black rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center"
              >
                {submitting ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : "Claim profile"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
