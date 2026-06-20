"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Check, X, ShieldAlert, Sparkles, TrendingUp, Users, Calendar, Mail, Search, Camera,
} from "lucide-react";

interface PhotographerRow {
  id: string;
  bio: string | null;
  base_price: number;
  locations: string[] | null;
  categories: string[] | null;
  public_code: string | null;
  is_approved: boolean;
  profiles: { full_name: string; avatar_url: string } | null;
}

const firstOf = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

export default function AdminApprovals() {
  const [photographers, setPhotographers] = useState<PhotographerRow[]>([]);
  const [stats, setStats] = useState({ totalBookings: 0, totalRevenue: 0, activeUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from("photographer_profiles")
        .select(`id, bio, base_price, locations, categories, public_code, is_approved,
          profiles:id ( full_name, avatar_url )`)
        .order("is_approved", { ascending: true });
      setPhotographers(
        (rows || []).map((r: any) => ({ ...r, profiles: firstOf(r.profiles) })) as PhotographerRow[]
      );

      const [{ count: bookingsCount }, { count: paidCount }, { count: usersCount }] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["paid", "confirmed", "completed"]),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        totalBookings: bookingsCount || 0,
        totalRevenue: (paidCount || 0) * 25000,
        activeUsers: usersCount || 0,
      });
    } catch (err) {
      console.error("admin load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setApproval = async (id: string, approved: boolean) => {
    if (!supabase) return;
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from("photographer_profiles")
        .update({ is_approved: approved, approved_at: approved ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      setPhotographers((prev) => prev.map((p) => (p.id === id ? { ...p, is_approved: approved } : p)));
    } catch (err) {
      console.error("approval:", err);
      alert("Could not update approval.");
    } finally {
      setActionLoading(null);
    }
  };

  const sendInvite = async (photographerId: string) => {
    setInviteMsg(null);
    if (!supabase) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteMsg("Enter a valid email.");
      return;
    }
    setActionLoading(photographerId);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/claim-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: sess.session?.access_token,
          photographer_id: photographerId,
          email: inviteEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite.");
      setInviteMsg(data.devClaimUrl ? `Dev link: ${data.devClaimUrl}` : "Invite sent ✓");
      if (!data.devClaimUrl) { setInviteFor(null); setInviteEmail(""); }
    } catch (err: any) {
      setInviteMsg(err.message || "Failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const pending = photographers.filter((p) => !p.is_approved);
  const filtered = photographers.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.profiles?.full_name?.toLowerCase().includes(q) ||
      p.public_code?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
      <div className="p-3.5 bg-accent/10 rounded-2xl"><Icon size={22} className="text-black dark:text-white" /></div>
      <div>
        <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-xl font-black text-foreground dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );

  const PhotographerCardRow = ({ photo, pendingMode }: { photo: PhotographerRow; pendingMode: boolean }) => (
    <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div className="flex items-start gap-4 flex-1">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.profiles?.avatar_url || "/media/default-profile.webp"} alt={photo.profiles?.full_name || "Photographer"} className="w-full h-full object-cover" />
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-black text-foreground dark:text-white leading-tight">{photo.profiles?.full_name || "Unknown"}</h3>
            {photo.public_code && <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-zinc-500">#{photo.public_code}</span>}
            {photo.is_approved
              ? <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-black uppercase tracking-wider">Approved</span>
              : <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[10px] font-black uppercase tracking-wider">Pending</span>}
          </div>
          <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold">Base: {photo.base_price?.toLocaleString()} KRW/hr</p>
          {pendingMode && <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">{photo.bio || "No biography provided."}</p>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {photo.locations?.slice(0, 4).map((loc) => (
              <span key={loc} className="px-2 py-0.5 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 rounded text-[10px] font-bold">{loc}</span>
            ))}
          </div>

          {inviteFor === photo.id && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                type="email" placeholder="photographer@email.com" value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-2 px-3 text-xs outline-none text-foreground dark:text-white"
              />
              <button onClick={() => sendInvite(photo.id)} disabled={actionLoading === photo.id}
                className="px-3 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-black rounded-xl hover:opacity-90">
                Send invite
              </button>
            </div>
          )}
          {inviteFor === photo.id && inviteMsg && <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 break-all">{inviteMsg}</p>}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2 flex-wrap">
        {pendingMode ? (
          <>
            <button onClick={() => setApproval(photo.id, true)} disabled={actionLoading === photo.id}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black font-black text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all">
              <Check size={16} /> Approve
            </button>
            <button onClick={() => setApproval(photo.id, false)} disabled={actionLoading === photo.id}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900">
              <X size={16} /> Reject
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setInviteFor(inviteFor === photo.id ? null : photo.id); setInviteMsg(null); setInviteEmail(""); }}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900">
              <Mail size={14} /> {inviteFor === photo.id ? "Close" : "Send claim invite"}
            </button>
            {photo.is_approved && (
              <button onClick={() => setApproval(photo.id, false)} disabled={actionLoading === photo.id}
                className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-bold text-xs rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900">
                Unpublish
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={TrendingUp} label="Platform Revenue" value={`${stats.totalRevenue.toLocaleString()} KRW`} />
        <StatCard icon={Camera} label="Photographers" value={photographers.length} />
        <StatCard icon={Users} label="Registered Users" value={stats.activeUsers} />
        <StatCard icon={Calendar} label="Total Bookings" value={stats.totalBookings} />
      </div>

      {/* Pending approvals */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-xl font-black text-foreground dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0"><Sparkles size={16} /></span>
            Verification Queue {pending.length > 0 && <span className="text-sm text-gray-400">({pending.length})</span>}
          </h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Review pending photographer profiles. Approvals are due within 3 business days.</p>
        </div>
        {pending.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
            <ShieldAlert size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">Queue Empty</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">No photographers awaiting approval.</p>
          </div>
        ) : (
          <div className="space-y-4">{pending.map((p) => <PhotographerCardRow key={p.id} photo={p} pendingMode />)}</div>
        )}
      </div>

      {/* All photographers + claim invites */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-foreground dark:text-white">All Photographers</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Send claim invites so photographers can manage their own profiles.</p>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name / #code"
              className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs outline-none text-foreground dark:text-white w-full sm:w-56" />
          </div>
        </div>
        <div className="space-y-4">
          {filtered.map((p) => <PhotographerCardRow key={p.id} photo={p} pendingMode={false} />)}
        </div>
      </div>
    </div>
  );
}
