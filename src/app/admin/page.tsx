"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  Check, X, ShieldAlert, Sparkles, TrendingUp, Users, Calendar, Mail, Search, Camera,
  Instagram, Globe, Clock, Zap, Languages, Palette, MapPin, Tag, RotateCcw,
} from "lucide-react";

interface PhotographerRow {
  id: string;
  bio: string | null;
  base_price: number;
  locations: string[] | null;
  categories: string[] | null;
  public_code: string | null;
  is_approved: boolean;
  instagram: string | null;
  instagram_url: string | null;
  languages: string[] | null;
  english_level: string | null;
  response_speed: string | null;
  delivery_time: string | null;
  styles: string[] | null;
  portfolio_urls: string[] | null;
  profiles: { full_name: string; avatar_url: string } | null;
}

interface RefundRow {
  id: string;
  status: string;
  fee_krw: number;
  created_at: string;
  cancel_reason: string | null;
  cancel_requested_at: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
  refund_currency: string | null;
  client: { full_name: string } | null;
  photographer: { full_name: string } | null;
  availability_slots: { start_time: string; end_time: string } | null;
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
  const [detailFor, setDetailFor] = useState<PhotographerRow | null>(null);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [refundLoading, setRefundLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from("photographer_profiles")
        .select(`id, bio, base_price, locations, categories, public_code, is_approved,
          instagram, instagram_url, languages, english_level, response_speed,
          delivery_time, styles, portfolio_urls,
          profiles:id ( full_name, avatar_url )`)
        .order("is_approved", { ascending: true });
      setPhotographers(
        (rows || []).map((r: any) => ({ ...r, profiles: firstOf(r.profiles) })) as PhotographerRow[]
      );

      // Refund queue: pending cancellation requests first, then already-refunded.
      const { data: refundRows } = await supabase
        .from("bookings")
        .select(`id, status, fee_krw, created_at, cancel_reason, cancel_requested_at,
          refunded_at, refund_amount, refund_currency,
          client:profiles!bookings_client_id_fkey ( full_name ),
          photographer:profiles!bookings_photographer_id_fkey ( full_name ),
          availability_slots:slot_id ( start_time, end_time )`)
        .in("status", ["cancellation_requested", "refunded"])
        .order("cancel_requested_at", { ascending: false, nullsFirst: false });
      setRefunds(
        (refundRows || []).map((r: any) => ({
          ...r,
          client: firstOf(r.client),
          photographer: firstOf(r.photographer),
          availability_slots: firstOf(r.availability_slots),
        })) as RefundRow[]
      );

      const [{ count: bookingsCount }, { count: paidCount }, { count: usersCount }, { count: refundedCount }] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["paid", "confirmed", "completed"]),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "refunded"),
      ]);
      setStats({
        totalBookings: bookingsCount || 0,
        // Revenue = paid bookings minus refunded ones (refunds claw the fee back).
        totalRevenue: ((paidCount || 0) - (refundedCount || 0)) * 25000,
        activeUsers: usersCount || 0,
      });
    } catch (err) {
      console.error("admin load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Admin issues a refund (reason required). Calls the server route which hits
  // Lemon Squeezy in live mode and records the refund audit row.
  const issueRefundFor = async (bookingId: string) => {
    if (!supabase) return;
    const reason = window.prompt(
      "Refund reason (required) — this is recorded in our internal audit log:"
    );
    if (reason === null) return;
    if (reason.trim().length < 3) { alert("Please enter a reason."); return; }
    setRefundLoading(bookingId);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: sess.session?.access_token,
          booking_id: bookingId,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed.");
      await load();
    } catch (err: any) {
      console.error("refund:", err);
      alert(err.message || "Refund failed.");
    } finally {
      setRefundLoading(null);
    }
  };

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
            <button
              onClick={() => setDetailFor(photo)}
              className="text-base font-black text-foreground dark:text-white leading-tight hover:text-accent dark:hover:text-accent underline-offset-2 hover:underline transition-colors text-left"
              title="View full details"
            >
              {photo.profiles?.full_name || "Unknown"}
            </button>
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
            <button onClick={() => setDetailFor(photo)}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900">
              <Search size={15} /> Details
            </button>
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

  const fmtSlot = (iso?: string) =>
    iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: ReactNode }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-zinc-900 last:border-0">
      <Icon size={15} className="text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">{label}</p>
        <div className="text-sm text-foreground dark:text-zinc-200 font-medium mt-0.5 break-words">{value || <span className="text-gray-300 dark:text-zinc-600">—</span>}</div>
      </div>
    </div>
  );

  const Chips = ({ items }: { items: string[] | null | undefined }) =>
    items && items.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => <span key={i} className="px-2 py-0.5 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded text-[11px] font-bold">{i}</span>)}
      </div>
    ) : <span className="text-gray-300 dark:text-zinc-600">—</span>;

  return (
    <div className="space-y-8">
      {/* ─── Photographer details modal ─── */}
      {detailFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDetailFor(null)}>
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={detailFor.profiles?.avatar_url || "/media/default-profile.webp"} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-foreground dark:text-white truncate">{detailFor.profiles?.full_name || "Unknown"}</h3>
                  {detailFor.public_code && <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-zinc-500">#{detailFor.public_code}</span>}
                </div>
              </div>
              <button onClick={() => setDetailFor(null)} className="p-2 text-gray-400 hover:text-foreground dark:hover:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900 shrink-0"><X size={18} /></button>
            </div>
            <div className="px-6 py-4">
              <DetailRow icon={Tag} label="Bio" value={detailFor.bio} />
              <DetailRow icon={TrendingUp} label="Base price" value={`${detailFor.base_price?.toLocaleString() || 0} KRW / hr`} />
              <DetailRow icon={MapPin} label="Locations" value={<Chips items={detailFor.locations} />} />
              <DetailRow icon={Camera} label="Categories" value={<Chips items={detailFor.categories} />} />
              <DetailRow icon={Palette} label="Styles" value={<Chips items={detailFor.styles} />} />
              <DetailRow icon={Languages} label="Languages" value={<Chips items={detailFor.languages} />} />
              <DetailRow icon={Globe} label="English level" value={detailFor.english_level} />
              <DetailRow icon={Zap} label="Response speed" value={detailFor.response_speed} />
              <DetailRow icon={Clock} label="Delivery time" value={detailFor.delivery_time} />
              <DetailRow icon={Instagram} label="Instagram" value={
                detailFor.instagram_url
                  ? <a href={detailFor.instagram_url} target="_blank" rel="noopener noreferrer" className="text-accent underline">{detailFor.instagram || detailFor.instagram_url}</a>
                  : detailFor.instagram
              } />
              <DetailRow icon={Camera} label={`Portfolio (${detailFor.portfolio_urls?.length || 0})`} value={
                detailFor.portfolio_urls && detailFor.portfolio_urls.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {detailFor.portfolio_urls.slice(0, 12).map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={u} alt="" className="aspect-square w-full object-cover rounded-lg bg-gray-100 dark:bg-zinc-800" />
                    ))}
                  </div>
                ) : null
              } />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={TrendingUp} label="Platform Revenue" value={`${stats.totalRevenue.toLocaleString()} KRW`} />
        <StatCard icon={Camera} label="Photographers" value={photographers.length} />
        <StatCard icon={Users} label="Registered Users" value={stats.activeUsers} />
        <StatCard icon={Calendar} label="Total Bookings" value={stats.totalBookings} />
      </div>

      {/* ─── Refunds & cancellations queue ─── */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-xl font-black text-foreground dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0"><RotateCcw size={16} /></span>
            Refunds & Cancellations
            {refunds.filter((r) => r.status === "cancellation_requested").length > 0 &&
              <span className="text-sm text-amber-500">({refunds.filter((r) => r.status === "cancellation_requested").length} pending)</span>}
          </h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Review cancellation requests and issue refunds. Every refund requires a reason and is logged. Refunds are recorded both here and in Lemon Squeezy.</p>
        </div>
        {refunds.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
            <RotateCcw size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">Nothing to review</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">No cancellation requests or refunds yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {refunds.map((r) => (
              <div key={r.id} className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-foreground dark:text-white">{r.client?.full_name || "User"}</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm font-bold text-gray-600 dark:text-zinc-300">{r.photographer?.full_name || "Photographer"}</span>
                    {r.status === "cancellation_requested"
                      ? <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[10px] font-black uppercase tracking-wider">Cancel requested</span>
                      : <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black uppercase tracking-wider">Refunded</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Shoot: {fmtSlot(r.availability_slots?.start_time)} · Fee: {(r.fee_krw / 1000).toFixed(0)}k KRW</p>
                  {r.cancel_reason && <p className="text-xs text-gray-600 dark:text-zinc-300"><span className="font-bold">Reason:</span> {r.cancel_reason}</p>}
                  {r.status === "refunded" && r.refunded_at && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      Refunded {r.refund_amount?.toLocaleString()} {r.refund_currency} on {new Date(r.refunded_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {r.status === "cancellation_requested" && (
                  <button onClick={() => issueRefundFor(r.id)} disabled={refundLoading === r.id}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black font-black text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
                    <RotateCcw size={15} /> {refundLoading === r.id ? "Issuing…" : "Issue refund"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
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
