"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Aperture, Search, CheckCircle2, Clock } from "lucide-react";

interface SphoterRow {
  id: string;
  is_approved: boolean;
  base_price: number | null;
  categories: string[] | null;
  instagram: string | null;
  public_code: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function AdminSphoters() {
  const [sphoters, setSphoters] = useState<SphoterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("photographer_profiles")
        .select("id, is_approved, base_price, categories, instagram, public_code, created_at, profiles:id(full_name, avatar_url)")
        .order("created_at", { ascending: false });
      setSphoters((data || []) as SphoterRow[]);
    } catch (err) {
      console.error("admin sphoters load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = sphoters.filter((s) => {
    if (filter === "approved" && !s.is_approved) return false;
    if (filter === "pending" && s.is_approved) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      s.profiles?.full_name?.toLowerCase().includes(q) ||
      s.public_code?.toLowerCase().includes(q) ||
      s.instagram?.toLowerCase().includes(q)
    );
  });

  const approvedCount = sphoters.filter((s) => s.is_approved).length;
  const pendingCount = sphoters.filter((s) => !s.is_approved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground dark:text-white flex items-center gap-2.5">
            <Aperture size={20} />
            Sphoters {sphoters.length > 0 && <span className="text-sm text-gray-400">({sphoters.length})</span>}
          </h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">All photographer accounts on the platform.</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / @handle / #code"
            className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs outline-none text-foreground dark:text-white w-full sm:w-64"
          />
        </div>
      </div>

      {/* Stat pills + filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "approved", "pending"] as const).map((f) => {
          const label = f === "all" ? `All (${sphoters.length})` : f === "approved" ? `Approved (${approvedCount})` : `Pending (${pendingCount})`;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all border ${
                filter === f
                  ? "bg-black dark:bg-white text-white dark:text-black border-transparent"
                  : "bg-white dark:bg-zinc-950 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
          <Aperture size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-lg font-black text-foreground dark:text-white">No sphoters found</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.profiles?.avatar_url || "/media/default-profile.webp"}
                  alt={s.profiles?.full_name || "Sphoter"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-foreground dark:text-white truncate">
                    {s.profiles?.full_name || "Unnamed"}
                  </h3>
                  {s.public_code && (
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded text-[10px] font-mono font-bold">
                      #{s.public_code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {s.instagram && (
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">{s.instagram}</span>
                  )}
                  {s.base_price != null && (
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">₩{s.base_price.toLocaleString()}/hr</span>
                  )}
                </div>
                {s.categories && s.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.categories.slice(0, 3).map((cat) => (
                      <span key={cat} className="px-1.5 py-0.5 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded text-[9px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {s.is_approved ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black">
                    <CheckCircle2 size={11} /> Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black">
                    <Clock size={11} /> Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
