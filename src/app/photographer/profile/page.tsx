"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES } from "@/lib/types";
import { Save, AlertCircle, Camera, Check, Upload, Trash2, Globe, MapPin } from "lucide-react";

export default function ProfileBuilder() {
  const { user } = useAuth();
  
  // Profile settings state
  const [bio, setBio] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  
  // Meta filters state
  const [instagram, setInstagram] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [englishLevel, setEnglishLevel] = useState("Basic");
  const [responseSpeed, setResponseSpeed] = useState("1–3 hours");
  const [deliveryTime, setDeliveryTime] = useState("1 week");
  const [styles, setStyles] = useState<string[]>([]);
  const [isApproved, setIsApproved] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const availableLocations = [
    "Historical / Landmarks",
    "Indoor / Studio",
    "Nature / Parks",
    "Outdoor / City etc",
    "Hongdae",
    "Gangnam",
    "Myeongdong",
    "Itaewon"
  ];

  const availableLanguages = ["English", "Korean", "Chinese", "Japanese", "Russian", "Spanish"];
  const englishLevels = ["Basic", "Conversational", "Fluent", "Native"];
  const responseSpeeds = ["Under 1 hour", "1–3 hours", "3–6 hours", "Over 6 hours"];
  const deliveryTimes = ["2-3 days", "1 week", "2 weeks", "Over 2 weeks"];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !supabase) return;
      setLoading(true);
      try {
        const { data, error: dbError } = await supabase
          .from("photographer_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (dbError) throw dbError;

        if (data) {
          setBio(data.bio || "");
          setBasePrice(data.base_price || 0);
          setSelectedLocations(data.locations || []);
          setSelectedCategories(data.categories || []);
          setPortfolioUrls(data.portfolio_urls || []);
          setInstagram(data.instagram || "");
          setInstagramUrl(data.instagram_url || "");
          setLanguages(data.languages || []);
          setEnglishLevel(data.english_level || "Basic");
          setResponseSpeed(data.response_speed || "1–3 hours");
          setDeliveryTime(data.delivery_time || "1 week");
          setStyles(data.styles || []);
          setIsApproved(data.is_approved || false);
        }
      } catch (err: any) {
        console.error("Error fetching photographer profile:", err);
        setError("Failed to load profile. Please make sure you are registered as a photographer.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    setSaveLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from("photographer_profiles")
        .update({
          bio,
          base_price: basePrice,
          locations: selectedLocations,
          categories: selectedCategories,
          portfolio_urls: portfolioUrls,
          instagram,
          instagram_url: instagramUrl,
          languages,
          english_level: englishLevel,
          response_speed: responseSpeed,
          delivery_time: deliveryTime,
          styles,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user || !supabase) return;
    
    if (portfolioUrls.length >= 10) {
      alert("You can only upload a maximum of 10 portfolio images.");
      return;
    }

    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      // 1. Upload to Supabase Storage bucket 'portfolios'
      const { error: uploadError } = await supabase.storage
        .from("portfolios")
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist or isn't writable, try letting user insert raw URLs
        throw uploadError;
      }

      // 2. Get public url
      const { data: { publicUrl } } = supabase.storage
        .from("portfolios")
        .getPublicUrl(filePath);

      setPortfolioUrls(prev => [...prev, publicUrl]);
    } catch (err: any) {
      console.error("Storage upload failed, trying local fallback:", err);
      // Ask user to enter URL manually as fallback
      const manualUrl = prompt("Upload failed. Enter public image URL manually:");
      if (manualUrl) {
        setPortfolioUrls(prev => [...prev, manualUrl]);
      }
    }
  };

  const removePortfolioImage = (indexToRemove: number) => {
    setPortfolioUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleLanguage = (lang: string) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header card */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground dark:text-white">Studio Profile</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Configure your bio, pricing, portfolio, and location tags.</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isApproved
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}
          >
            {isApproved ? "Approved & Public" : "Pending Admin Review"}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-950/50">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm border border-emerald-100 dark:border-emerald-950/50">
          <Check size={18} />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Form Settings */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-foreground dark:text-white mb-2">Basic Info</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Starting Price (KRW / Hour)</label>
                <input
                  type="number"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Instagram Handle</label>
                <input
                  type="text"
                  placeholder="@joshfotos_"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Instagram URL</label>
              <input
                type="url"
                placeholder="https://www.instagram.com/joshfotos_/"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Studio Bio</label>
              <textarea
                placeholder="Tell clients about your photography style, experiences, and equipment..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 text-sm outline-none text-foreground dark:text-white resize-none"
              />
            </div>
          </div>

          {/* Tag Selectors */}
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-foreground dark:text-white flex items-center gap-2">
              <MapPin size={18} className="text-accent" />
              Locations & Categories
            </h3>

            {/* Locations */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">Locations Served</label>
              <div className="flex flex-wrap gap-2">
                {availableLocations.map(loc => {
                  const active = selectedLocations.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => toggleLocation(loc)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        active
                          ? "border-accent bg-accent/10 text-black dark:text-white font-black"
                          : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400"
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categories */}
            <div className="pt-2">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">Global Categories</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        active
                          ? "border-accent bg-accent/10 text-black dark:text-white font-black"
                          : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Portfolio Portfolio Image list */}
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-black text-foreground dark:text-white flex items-center gap-2">
                <Camera size={18} className="text-accent" />
                Portfolio ({portfolioUrls.length}/10)
              </h3>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-black bg-black dark:bg-white text-white dark:text-black px-3.5 py-2 rounded-full hover:opacity-90 transition-opacity">
                <Upload size={12} />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {portfolioUrls.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-gray-200 dark:border-zinc-800 text-center rounded-2xl">
                <p className="text-sm text-gray-400 dark:text-zinc-500">No images uploaded. Add up to 10 photos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {portfolioUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-900">
                    <img src={url} alt={`Portfolio ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePortfolioImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Form Settings */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-foreground dark:text-white flex items-center gap-2">
              <Globe size={16} className="text-accent" />
              Service Performance
            </h3>

            {/* Languages */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">Languages Spoken</label>
              <div className="flex flex-wrap gap-1.5">
                {availableLanguages.map(lang => {
                  const active = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                        active
                          ? "border-accent bg-accent/10 text-black dark:text-white font-black"
                          : "border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* English Level */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">English Proficiency</label>
              <select
                value={englishLevel}
                onChange={(e) => setEnglishLevel(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
              >
                {englishLevels.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            {/* Response Speed */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Response Speed</label>
              <select
                value={responseSpeed}
                onChange={(e) => setResponseSpeed(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
              >
                {responseSpeeds.map(spd => (
                  <option key={spd} value={spd}>{spd}</option>
                ))}
              </select>
            </div>

            {/* Delivery Time */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Delivery Time</label>
              <select
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
              >
                {deliveryTimes.map(dt => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black font-black rounded-xl text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {saveLoading ? (
                <span className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Profile settings</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
