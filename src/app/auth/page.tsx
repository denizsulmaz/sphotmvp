"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { Lock, Mail, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<"client" | "photographer">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleAuth = async () => {
    if (!supabase) return;
    setError(null);
    setGoogleLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || "Google authentication failed.");
      setGoogleLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isSignUp && !privacyConsent) {
      setError("You must agree to the Privacy Policy to register.");
      setLoading(false);
      return;
    }

    if (!supabase) {
      setError("Supabase client is not configured.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
        } else if (data.user) {
          if (data.session) {
            // Logged in immediately (email confirmation disabled in Supabase)
            setSuccess("Registration successful!");
            setTimeout(() => {
              if (role === "photographer") {
                router.push("/photographer/profile");
              } else {
                router.push("/client/dashboard");
              }
            }, 1000);
          } else {
            // Email verification required
            setSuccess("Check your email to verify your account!");
          }
        }
      } else {
        // Sign In Flow
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
        } else if (data.user) {
          setSuccess("Welcome back!");
          // Fetch role to route — but never block the redirect on it.
          // If the profile query is slow, fall back to the client dashboard.
          const roleQuery = supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single()
            .then(({ data: p }) => p?.role as string | undefined);
          const role = await Promise.race([
            roleQuery,
            new Promise<undefined>((r) => setTimeout(() => r(undefined), 2500)),
          ]);

          if (role === "admin") router.replace("/admin/dashboard");
          else if (role === "photographer") router.replace("/photographer/dashboard");
          else router.replace("/client/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-none transition-all duration-300">
        
        {/* Toggle tabs */}
        <div className="flex border-b border-gray-100 dark:border-zinc-800 mb-8">
          <button
            onClick={() => {
              setIsSignUp(false);
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 pb-4 text-sm font-black transition-colors ${
              !isSignUp
                ? "text-black dark:text-white border-b-2 border-accent"
                : "text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white"
            }`}
          >
            {t("signIn")}
          </button>
          <button
            onClick={() => {
              setIsSignUp(true);
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 pb-4 text-sm font-black transition-colors ${
              isSignUp
                ? "text-black dark:text-white border-b-2 border-accent"
                : "text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white"
            }`}
          >
            {t("register") || "Register"}
          </button>
        </div>

        {/* Header Text */}
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight text-foreground dark:text-white">
            {isSignUp ? "Create your SPHOT account" : "Welcome back to SPHOT"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            {isSignUp
              ? "Create your account to get started with booking."
              : "Sign in to access your dashboard and bookings."}
          </p>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm mb-6 border border-red-100 dark:border-red-950/50">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm mb-6 border border-emerald-100 dark:border-emerald-950/50">
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              {/* Full Name input */}
              <div className="relative">
                <User size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-black dark:focus:border-white transition-all text-foreground dark:text-white"
                />
              </div>
            </>
          )}

          {/* Email input */}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
            <input
              type="email"
              required
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-black dark:focus:border-white transition-all text-foreground dark:text-white"
            />
          </div>

          {/* Password input */}
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Password"
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

          {isSignUp && (
            <label className="flex items-start gap-2.5 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-zinc-600 accent-accent"
                required
              />
              <span className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                I agree to the{" "}
                <Link href="/privacy" className="underline font-bold text-foreground dark:text-white hover:text-accent transition-colors">
                  Privacy Policy
                </Link>{" "}
                and consent to the processing of my personal data.
              </span>
            </label>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
          <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading}
          className="w-full py-3.5 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-black text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-900 transition-all flex items-center justify-center gap-3"
        >
          {googleLoading ? (
            <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              {isSignUp ? "Sign up with Google" : "Sign in with Google"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
