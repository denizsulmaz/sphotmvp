"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { CATEGORIES } from "@/lib/types";
import { Lock, Mail, User, AlertCircle, Eye, EyeOff, MapPin, DollarSign, ExternalLink, Instagram, Shield, Award, Camera } from "lucide-react";
import Link from "next/link";

export default function PhotographerAuthPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Photographer Application Details
  const [location, setLocation] = useState("Seoul");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [basePrice, setBasePrice] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["English"]);
  const [experienceLevel, setExperienceLevel] = useState("Professional");
  const [equipment, setEquipment] = useState("");
  const [bio, setBio] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const availableLocations = ["Seoul", "Bangkok", "Tokyo", "Moscow"];
  const availableLanguages = ["English", "Korean", "Chinese", "Japanese", "Russian", "Spanish"];
  const experienceLevels = ["Intermediate", "Professional", "Studio / Agency"];

  const handleCategoryToggle = (cat: string) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleLanguageToggle = (lang: string) => {
    setSelectedLangs(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isSignUp && !privacyConsent) {
      setError("You must agree to the Privacy Policy to apply.");
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
        // Validation for detailed photographer fields
        if (selectedCats.length === 0) {
          setError("Please select at least one service category.");
          setLoading(false);
          return;
        }
        if (!portfolioLink) {
          setError("Please provide a link to your portfolio.");
          setLoading(false);
          return;
        }

        // Sign Up Flow for Photographers
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: "photographer",
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
        } else if (data.user) {
          // If email confirmation is enabled there is no session yet — any profile
          // update or upload would run unauthenticated and be rejected by RLS.
          if (!data.session) {
            setSuccess("Check your email to confirm your account, then sign in to complete your application.");
            setTimeout(() => {
              setIsSignUp(false);
            }, 3000);
            return;
          }

          // Upload avatar if provided
          let avatarUrl: string | null = null;
          if (avatarFile && supabase) {
            const ext = avatarFile.name.split(".").pop();
            const filePath = `${data.user.id}/avatar.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from("avatars")
              .upload(filePath, avatarFile, { upsert: true });
            if (uploadErr) {
              setError(`Your account was created, but your profile picture failed to upload: ${uploadErr.message}. Please sign in and add it from your profile page.`);
              return;
            }
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
            avatarUrl = publicUrl;
            const { error: avatarErr } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", data.user.id);
            if (avatarErr) {
              setError(`Your account was created, but your profile picture could not be saved: ${avatarErr.message}. Please sign in and add it from your profile page.`);
              return;
            }
          }

          let cleanInstagram = socialLink.trim();
          if (cleanInstagram.includes("instagram.com/")) {
            const parts = cleanInstagram.split("instagram.com/");
            if (parts[1]) {
              cleanInstagram = parts[1].split(/[?#]/)[0].replace(/\/$/, "");
            }
          }
          cleanInstagram = cleanInstagram.replace(/^@/, "");
          const finalHandle = cleanInstagram ? `@${cleanInstagram}` : "";
          const finalUrl = cleanInstagram ? `https://www.instagram.com/${cleanInstagram}/` : "";

          const { error: profileError } = await supabase
            .from("photographer_profiles")
            .update({
              bio: `Experience: ${experienceLevel}\nEquipment: ${equipment}\nBio: ${bio}`,
              base_price: Number(basePrice) || 0,
              locations: [location],
              categories: selectedCats,
              portfolio_urls: [portfolioLink],
              instagram: finalHandle,
              instagram_url: finalUrl,
              languages: selectedLangs,
              english_level: selectedLangs.includes("English") ? "Fluent" : "Basic",
            })
            .eq("id", data.user.id);

          if (profileError) {
            console.error("Failed to save detailed application fields:", profileError);
            setError(`Your account was created, but we could not save your application details: ${profileError.message}. Please sign in and complete your profile.`);
            return;
          }

          // Send admin notification
          const { data: sessionData } = await supabase.auth.getSession();
          const access_token = sessionData.session?.access_token;
          if (access_token) {
            await fetch("/api/notify/transaction", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token,
                type: "photographer_signup",
                details: {
                  fullName,
                  instagram: finalHandle,
                  basePrice,
                  portfolioLink,
                  location,
                },
              }),
            }).catch((e) => console.error("Signup notification error:", e));
          }

          setSuccess("Application submitted successfully! Your account is created and pending admin verification.");
          setTimeout(() => {
            router.push("/photographer/dashboard");
          }, 2000);
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
          // Verify role
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

          if (profileError || !profile) {
            await supabase.auth.signOut();
            setError("Could not retrieve user profile.");
            setLoading(false);
            return;
          }

          if (profile.role !== "photographer" && profile.role !== "admin") {
            await supabase.auth.signOut();
            setError("Access denied. This portal is for Sphoters only.");
            setLoading(false);
            return;
          }

          setSuccess("Welcome back!");
          setTimeout(() => {
            if (profile.role === "admin") {
              router.push("/admin/dashboard");
            } else {
              router.push("/photographer/dashboard");
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
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-16">
      <div className={`w-full ${isSignUp ? "max-w-2xl" : "max-w-md"} bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-none transition-all duration-300`}>
        
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
            Apply to Join
          </button>
        </div>

        {/* Header Text */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black tracking-tight text-foreground dark:text-white flex items-center justify-center gap-2.5">
            {isSignUp ? (
              <>
                <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
                  <Award size={18} />
                </span>
                <span>SPHOT Sphoter Application</span>
              </>
            ) : (
              "Sphoter Portal"
            )}
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 max-w-lg mx-auto">
            {isSignUp
              ? "Complete the details below to apply as a Sphoter. Admin approval is completed within 3 business days."
              : "Sign in to access your Sphoter dashboard, schedule, and portfolio settings."}
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

        <form onSubmit={handleAuth} className="space-y-6">
          
          {isSignUp ? (
            /* Multi-field detailed registration layout */
            <div className="space-y-6">
              
              {/* SECTION 1: Credentials */}
              <div className="border-b border-gray-100 dark:border-zinc-800 pb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-3">1. Account Details</h3>

                {/* Profile picture */}
                <div className="flex items-center gap-4 mb-4">
                  <label className="relative cursor-pointer group">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center transition-all group-hover:border-accent">
                      {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={22} className="text-gray-400 dark:text-zinc-500 group-hover:text-accent transition-colors" />
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                  <div>
                    <p className="text-xs font-black text-foreground dark:text-white">Profile Picture</p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Click to upload — shown on your public profile</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
                <div className="relative mt-4">
                  <Lock size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Create Password"
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
              </div>

              {/* SECTION 2: Professional details */}
              <div className="border-b border-gray-100 dark:border-zinc-800 pb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-3">2. Service & Location</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1">
                      <MapPin size={12} /> Primary Location
                    </label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                    >
                      {availableLocations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1">
                      <DollarSign size={12} /> Starting Price per Hour (KRW)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 150000"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value.replace(/^0+(?=\d)/, ''))}
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 mb-2">Service Categories (select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => {
                      const selected = selectedCats.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryToggle(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            selected
                              ? "border-accent bg-accent/10 text-black dark:text-white font-black"
                              : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Portfolio & Experience */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-3">3. Portfolio & Verification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1">
                      <ExternalLink size={12} /> External Portfolio Link
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="Google Drive, Dropbox, or website link"
                      value={portfolioLink}
                      onChange={(e) => setPortfolioLink(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1">
                      <Instagram size={12} /> Instagram Handle
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. @yourhandle"
                      value={socialLink}
                      onChange={(e) => setSocialLink(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 mb-1.5">Primary Languages</label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableLanguages.map(lang => {
                        const selected = selectedLangs.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleLanguageToggle(lang)}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all ${
                              selected
                                ? "border-accent bg-accent/10 text-black dark:text-white font-black"
                                : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 mb-1.5">Experience Level</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                    >
                      {experienceLevels.map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 mb-1.5">Camera Equipment & Lenses Used</label>
                  <input
                    type="text"
                    placeholder="Sony A7R V, 35mm f1.4, 24-70mm f2.8, etc."
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 mb-1.5">Short Bio (Introduction to Users)</label>
                  <textarea
                    rows={3}
                    placeholder="Introduce yourself, your photo style, and what you enjoy capturing..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 text-sm outline-none text-foreground dark:text-white resize-none focus:border-black dark:focus:border-white transition-all"
                  />
                </div>
              </div>

            </div>
          ) : (
            /* Sign In Layout */
            <div className="space-y-4">
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
            </div>
          )}

          {isSignUp && (
            <label className="flex items-start gap-2.5 cursor-pointer">
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
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              "Submit Application"
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
