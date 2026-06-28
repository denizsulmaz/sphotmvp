"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES } from "@/lib/types";
import { Camera, MapPin, Upload, Trash2, Check, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = ["Profile", "Service Details", "Portfolio"];

const LOCATIONS = [
  "Historical / Landmarks", "Indoor / Studio", "Nature / Parks",
  "Outdoor / City etc", "Hongdae", "Gangnam", "Myeongdong", "Itaewon",
];
const LANGUAGES = ["English", "Korean", "Chinese", "Japanese", "Russian", "Spanish"];
const RESPONSE_SPEEDS = ["Under 1 hour", "1–3 hours", "3–6 hours", "Over 6 hours"];
const DELIVERY_TIMES = ["2-3 days", "1 week", "2 weeks", "Over 2 weeks"];

export default function PhotographerOnboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Profile
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  // Step 2 — Service Details
  const [basePrice, setBasePrice] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English"]);
  const [responseSpeed, setResponseSpeed] = useState("1–3 hours");
  const [deliveryTime, setDeliveryTime] = useState("1 week");

  // Step 3 — Portfolio
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  // Check if already onboarded (has categories), redirect to profile
  useEffect(() => {
    const check = async () => {
      if (!user || !supabase) return;
      const { data } = await supabase
        .from("photographer_profiles")
        .select("categories, avatar_url")
        .eq("id", user.id)
        .single();
      if (data?.categories?.length) {
        router.replace("/photographer/profile");
      }
    };
    check();
  }, [user, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const toggle = <T extends string>(list: T[], setList: (v: T[]) => void, val: T) => {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !supabase) return;
    if (portfolioUrls.length >= 12) return;

    const idx = portfolioUrls.length;
    setUploadingIdx(idx);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    try {
      const { error: uploadErr } = await supabase.storage.from("portfolios").upload(filePath, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("portfolios").getPublicUrl(filePath);
      setPortfolioUrls((prev) => [...prev, publicUrl]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploadingIdx(null);
      e.target.value = "";
    }
  };

  const removePortfolio = (idx: number) => {
    setPortfolioUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const canAdvance = () => {
    if (step === 0) return bio.trim().length > 0;
    if (step === 1) return selectedCategories.length > 0 && basePrice !== "" && Number(basePrice) > 0;
    return true;
  };

  const handleFinish = async () => {
    if (!user || !supabase) return;
    setSaving(true);
    setError(null);

    try {
      // Upload avatar
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const filePath = `${user.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(filePath, avatarFile, { upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
          await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
        }
      }

      // Save profile
      const { error: profileErr } = await supabase
        .from("photographer_profiles")
        .update({
          bio,
          base_price: Number(basePrice),
          locations: selectedLocations,
          categories: selectedCategories,
          languages: selectedLanguages,
          response_speed: responseSpeed,
          delivery_time: deliveryTime,
          portfolio_urls: portfolioUrls,
        })
        .eq("id", user.id);

      if (profileErr) throw profileErr;
      router.push("/photographer/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                i < step ? "bg-accent text-black" : i === step ? "bg-black dark:bg-white text-white dark:text-black" : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500"
              }`}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span className={`text-xs font-bold hidden sm:block ${i === step ? "text-foreground dark:text-white" : "text-gray-400 dark:text-zinc-500"}`}>{label}</span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded-full mx-1 ${i < step ? "bg-accent" : "bg-gray-100 dark:bg-zinc-800"}`} />
              )}
            </div>
          ))}
        </div>
        <h1 className="text-2xl font-black text-foreground dark:text-white">
          {step === 0 && "Set up your profile"}
          {step === 1 && "Your services"}
          {step === 2 && "Build your portfolio"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          {step === 0 && "Add a photo and a short bio so clients know who you are."}
          {step === 1 && "Define what you shoot, where, and at what price."}
          {step === 2 && "Upload up to 12 of your best shots. First impressions matter."}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
          {error}
        </div>
      )}

      {/* Step 1: Profile */}
      {step === 0 && (
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center transition-all group-hover:border-accent">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={28} className="text-gray-400 dark:text-zinc-500 group-hover:text-accent transition-colors" />
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Click to upload profile photo</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">
              Short Bio <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell clients about your style, experience, and what you love to shoot..."
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 text-sm outline-none text-foreground dark:text-white resize-none focus:border-black dark:focus:border-white transition-all"
            />
          </div>
        </div>
      )}

      {/* Step 2: Service Details */}
      {step === 1 && (
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Price */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">
              Starting Price (KRW / hour) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="e.g. 150000"
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">
              Categories <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = selectedCategories.includes(cat);
                return (
                  <button key={cat} type="button" onClick={() => toggle(selectedCategories, setSelectedCategories, cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active ? "border-accent bg-accent/10 text-black dark:text-white" : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300"}`}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2 flex items-center gap-1">
              <MapPin size={11} /> Locations Served
            </label>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((loc) => {
                const active = selectedLocations.includes(loc);
                return (
                  <button key={loc} type="button" onClick={() => toggle(selectedLocations, setSelectedLocations, loc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active ? "border-accent bg-accent/10 text-black dark:text-white" : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300"}`}>
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const active = selectedLanguages.includes(lang);
                return (
                  <button key={lang} type="button" onClick={() => toggle(selectedLanguages, setSelectedLanguages, lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active ? "border-accent bg-accent/10 text-black dark:text-white" : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300"}`}>
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Response & Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Response Speed</label>
              <select value={responseSpeed} onChange={(e) => setResponseSpeed(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white">
                {RESPONSE_SPEEDS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Delivery Time</label>
              <select value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white">
                {DELIVERY_TIMES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Portfolio */}
      {step === 2 && (
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">
              {portfolioUrls.length}/12 photos uploaded
            </p>
            {portfolioUrls.length < 12 && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-black bg-black dark:bg-white text-white dark:text-black px-3.5 py-2 rounded-full hover:opacity-90 transition-opacity">
                <Upload size={12} /> Add Photo
                <input type="file" accept="image/*" onChange={handlePortfolioUpload} className="hidden" disabled={uploadingIdx !== null} />
              </label>
            )}
          </div>

          {portfolioUrls.length === 0 && uploadingIdx === null ? (
            <label className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:border-accent transition-colors group">
              <Camera size={36} className="text-gray-300 dark:text-zinc-700 group-hover:text-accent transition-colors mb-3" />
              <p className="text-sm font-bold text-gray-400 dark:text-zinc-500">Click to upload your first photo</p>
              <p className="text-xs text-gray-300 dark:text-zinc-600 mt-1">Up to 12 images</p>
              <input type="file" accept="image/*" onChange={handlePortfolioUpload} className="hidden" />
            </label>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {portfolioUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                  <button type="button" onClick={() => removePortfolio(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={13} />
                  </button>
                  <span className="absolute bottom-2 left-2 w-5 h-5 bg-black/50 rounded-full text-white text-[10px] font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                </div>
              ))}
              {uploadingIdx !== null && (
                <div className="aspect-square rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center border border-dashed border-gray-300 dark:border-zinc-700">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-zinc-500 text-center pt-2">
            You can always add or remove photos later in your Studio Profile.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        {step > 0 ? (
          <button onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 transition-all">
            <ChevronLeft size={16} /> Back
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <button onClick={() => { setError(null); setStep((s) => s + 1); }} disabled={!canAdvance()}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Continue <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleFinish} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black bg-accent text-black hover:opacity-90 transition-all disabled:opacity-60">
            {saving ? (
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Check size={16} /> Finish Setup</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
