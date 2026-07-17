"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MessageSquare, Search, Clock, Flag } from "lucide-react";

interface ConvRow {
  id: string; // booking id
  status: string;
  created_at: string;
  client_id: string;
  photographer_id: string;
  client?: { full_name: string } | { full_name: string }[] | null;
  photographer?: { full_name: string } | { full_name: string }[] | null;
  lastMessage?: string;
  msgCount?: number;
  reported?: boolean;
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

export default function AdminConversations() {
  const [convos, setConvos] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ConvRow | null>(null);
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // All bookings that can have a conversation (chat unlocks at payment).
      const { data } = await supabase
        .from("bookings")
        .select(`id, status, created_at, client_id, photographer_id,
          client:profiles!bookings_client_id_fkey ( full_name ),
          photographer:profiles!bookings_photographer_id_fkey ( full_name )`)
        .neq("status", "pending")
        .order("created_at", { ascending: false });

      const rows = (data || []) as ConvRow[];

      // Flag which have open reports (small set; one query).
      const { data: reps } = await supabase.from("reports").select("booking_id").eq("status", "open");
      const reported = new Set((reps || []).map((r: any) => r.booking_id));
      rows.forEach((r) => (r.reported = reported.has(r.id)));

      setConvos(rows);
    } catch (err) {
      console.error("conversations load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openConv = async (c: ConvRow) => {
    if (!supabase) return;
    setOpen(c);
    setLoadingChat(true);
    setTranscript([]);
    try {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, kind, content, created_at")
        .eq("booking_id", c.id)
        .order("created_at", { ascending: true });
      setTranscript((msgs || []) as Msg[]);
    } finally {
      setLoadingChat(false);
    }
  };

  const nameOf = (v: ConvRow["client"]) => firstOf(v)?.full_name || "—";

  const filtered = convos.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return nameOf(c.client).toLowerCase().includes(q) || nameOf(c.photographer).toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* List */}
      <div className="lg:col-span-5 space-y-3">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-foreground dark:text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-accent" /> Conversations
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{convos.length} booking chats</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people"
              className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-2 pl-8 pr-3 text-xs outline-none text-foreground dark:text-white w-36" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-10 text-center shadow-sm">
            <MessageSquare size={36} className="mx-auto text-gray-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm font-bold text-foreground dark:text-white">No conversations</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[560px] overflow-y-auto hide-scrollbar pr-1">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => openConv(c)}
                className={`w-full text-left bg-white dark:bg-zinc-950 border rounded-2xl p-4 shadow-sm transition-all ${
                  open?.id === c.id ? "border-accent" : "border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground dark:text-white truncate">
                    {nameOf(c.client)} <span className="text-gray-400 font-normal">↔</span> {nameOf(c.photographer)}
                  </p>
                  {c.reported && <Flag size={13} className="text-red-500 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    c.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : c.status === "cancelled" ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-accent/15 text-black dark:text-accent"}`}>{c.status}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10} />{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="lg:col-span-7">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm h-[620px] flex flex-col">
          {!open ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-zinc-500">
              <MessageSquare size={40} className="mb-3 text-gray-300 dark:text-zinc-700" />
              <p className="text-sm font-bold text-foreground dark:text-white">Select a conversation</p>
              <p className="text-xs mt-1">Open any booking chat to view the full transcript.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
                <p className="text-sm font-black text-foreground dark:text-white">
                  {nameOf(open.client)} ↔ {nameOf(open.photographer)}
                </p>
                <p className="text-[11px] text-gray-400">Read-only · {open.status}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                {loadingChat ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>
                ) : transcript.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">No messages yet.</p>
                ) : (
                  transcript.map((m) => {
                    if (m.kind === "system" || !m.sender_id) {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <div className="max-w-[85%] bg-accent/10 border border-accent/30 rounded-2xl px-3 py-2 text-[11px] text-center whitespace-pre-wrap text-foreground dark:text-zinc-100">{m.content}</div>
                        </div>
                      );
                    }
                    const senderName = m.sender_id === open.client_id ? nameOf(open.client) : nameOf(open.photographer);
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
