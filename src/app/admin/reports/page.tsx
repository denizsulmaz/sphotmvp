"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Flag, MessageSquare, Check, X, Clock, ShieldAlert } from "lucide-react";

interface ReportRow {
  id: string;
  booking_id: string;
  reason: string | null;
  status: "open" | "reviewed" | "dismissed";
  created_at: string;
  reporter_id: string | null;
}
interface Msg {
  id: string;
  sender_id: string | null;
  kind?: "user" | "system";
  content: string;
  created_at: string;
}

const firstOf = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

export default function AdminReports() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [openReport, setOpenReport] = useState<ReportRow | null>(null);
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [parties, setParties] = useState<{ client?: string; photographer?: string }>({});
  const [clientId, setClientId] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("reports")
        .select("id, booking_id, reason, status, created_at, reporter_id")
        .order("created_at", { ascending: false });
      const rows = (data || []) as ReportRow[];
      setReports(rows);

      // Resolve reporter names.
      const ids = Array.from(new Set(rows.map((r) => r.reporter_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => (map[p.id] = p.full_name));
        setNames(map);
      }
    } catch (err) {
      console.error("reports load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openTranscript = async (report: ReportRow) => {
    if (!supabase) return;
    setOpenReport(report);
    setLoadingChat(true);
    setTranscript([]);
    try {
      // Parties on the booking.
      const { data: b } = await supabase
        .from("bookings")
        .select(`client_id, client:profiles!bookings_client_id_fkey(full_name), photographer:profiles!bookings_photographer_id_fkey(full_name)`)
        .eq("id", report.booking_id)
        .maybeSingle();
      setClientId((b as any)?.client_id || null);
      setParties({
        client: firstOf((b as any)?.client)?.full_name,
        photographer: firstOf((b as any)?.photographer)?.full_name,
      });
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, kind, content, created_at")
        .eq("booking_id", report.booking_id)
        .order("created_at", { ascending: true });
      setTranscript((msgs || []) as Msg[]);
    } finally {
      setLoadingChat(false);
    }
  };

  const setStatus = async (id: string, status: ReportRow["status"]) => {
    if (!supabase) return;
    await supabase.from("reports").update({ status }).eq("id", id);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (openReport?.id === id) setOpenReport({ ...openReport, status });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Reports list */}
      <div className="lg:col-span-5 space-y-3">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
          <h2 className="text-lg font-black text-foreground dark:text-white flex items-center gap-2">
            <Flag size={18} className="text-accent" /> Reported Conversations
          </h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Review flagged chats and take action.</p>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-10 text-center shadow-sm">
            <ShieldAlert size={36} className="mx-auto text-gray-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm font-bold text-foreground dark:text-white">No reports</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">Flagged conversations will appear here.</p>
          </div>
        ) : (
          reports.map((r) => (
            <button key={r.id} onClick={() => openTranscript(r)}
              className={`w-full text-left bg-white dark:bg-zinc-950 border rounded-2xl p-4 shadow-sm transition-all ${
                openReport?.id === r.id ? "border-accent" : "border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  r.status === "open" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : r.status === "reviewed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"}`}>{r.status}</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10} />{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-bold text-foreground dark:text-white mt-2">{r.reason || "No reason given"}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">By {r.reporter_id ? names[r.reporter_id] || "User" : "Unknown"}</p>
            </button>
          ))
        )}
      </div>

      {/* Transcript */}
      <div className="lg:col-span-7">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm h-[600px] flex flex-col">
          {!openReport ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-zinc-500">
              <MessageSquare size={40} className="mb-3 text-gray-300 dark:text-zinc-700" />
              <p className="text-sm font-bold text-foreground dark:text-white">Select a report</p>
              <p className="text-xs mt-1">Open a reported conversation to view the full transcript.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-foreground dark:text-white">
                    {parties.client || "User"} ↔ {parties.photographer || "Photographer"}
                  </p>
                  <p className="text-[11px] text-gray-400">Read-only transcript</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStatus(openReport.id, "reviewed")}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/20">
                    <Check size={13} /> Reviewed
                  </button>
                  <button onClick={() => setStatus(openReport.id, "dismissed")}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-xs font-bold rounded-lg hover:opacity-80">
                    <X size={13} /> Dismiss
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                {loadingChat ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>
                ) : transcript.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">No messages in this conversation.</p>
                ) : (
                  transcript.map((m) => {
                    if (m.kind === "system") {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <div className="max-w-[85%] bg-accent/10 border border-accent/30 rounded-2xl px-3 py-2 text-[11px] text-center whitespace-pre-wrap text-foreground dark:text-zinc-100">{m.content}</div>
                        </div>
                      );
                    }
                    const senderName = m.sender_id === clientId ? (parties.client || "User") : (parties.photographer || "Photographer");
                    return (
                      <div key={m.id} className="flex justify-start">
                        <div className="max-w-[80%] bg-gray-100 dark:bg-zinc-900 rounded-2xl px-3 py-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{senderName}</span>
                          <p className="text-xs whitespace-pre-wrap break-words text-foreground dark:text-zinc-100 mt-0.5">{m.content}</p>
                          <span className="text-[9px] text-gray-400 mt-1 block">{new Date(m.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
