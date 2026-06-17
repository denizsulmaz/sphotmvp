"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { Lock, Mail, User, AlertCircle, Eye, EyeOff } from "lucide-react";

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

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
          // Fetch user profile to route properly
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

          setTimeout(() => {
            if (profile?.role === "admin") {
              router.push("/admin/dashboard");
            } else if (profile?.role === "photographer") {
              router.push("/photographer/dashboard");
            } else {
              router.push("/client/dashboard");
            }
          }, 1000);
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
            {t("Sign In")}
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
            {t("Register") || "Register"}
          </button>
        </div>

        {/* Header Text */}
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight text-foreground dark:text-white">
            {isSignUp ? "Create your SPHOT account" : "Welcome back to SPHOT"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            {isSignUp
              ? "Join us as a client or photographer to get started."
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
              {/* Role Picker */}
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => setRole("client")}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                    role === "client"
                      ? "border-accent bg-accent/10 text-black dark:text-white font-black"
                      : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700"
                  }`}
                >
                  I want to Book
                </button>
                <button
                  type="button"
                  onClick={() => setRole("photographer")}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                    role === "photographer"
                      ? "border-accent bg-accent/10 text-black dark:text-white font-black"
                      : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700"
                  }`}
                >
                  I'm a Photographer
                </button>
              </div>

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
      </div>
    </div>
  );
}
