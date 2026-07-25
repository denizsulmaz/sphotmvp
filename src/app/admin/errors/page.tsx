"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Bug, RefreshCw, Trash2, ChevronDown, ChevronUp, User as UserIcon } from "lucide-react";

interface ErrorLog {
  id: string;
  user_id: string | null;
  message: string;
  stack: string | null;
  page: string | null;
  user_agent: string | null;
  source: string;
  created_at: string;
}

export default function AdminErrorsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (dbErr) throw dbErr;
      const rows = (data || []) as ErrorLog[];
      setLogs(rows);

      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", userIds);
        setNames(new Map((profiles || []).map((p: any) => [p.id, `${p.full_name || "Unnamed"} (${p.role})`])));
      }
    } catch (err: any) {
      console.error("Failed to load error logs:", err);
      setError(err.message || "Failed to load error logs. Did you run the error-logs migration?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const clearAll = async () => {
    if (!supabase) return;
    if (!confirm("Delete all error logs?")) return;
    await supabase.from("error_logs").delete().gte("created_at", "1970-01-01");
    fetchLogs();
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground dark:text-white flex items-center gap-2">
            <Bug size={22} /> Client Errors
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Errors reported from users&apos; browsers. New error types also alert hi@booksphot.com by email.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            className="p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-gray-500 dark:text-zinc-400" />
          </button>
          {logs.length > 0 && (
            <button
              onClick={clearAll}
              className="p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title="Clear all"
            >
              <Trash2 size={18} className="text-red-400" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-950/50">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
          <Bug size={48} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-lg font-black text-foreground dark:text-white">No Errors Logged</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Client-side errors will appear here as they happen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isOpen = expanded === log.id;
            return (
              <div
                key={log.id}
                className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : log.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground dark:text-white truncate">{log.message}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{fmt(log.created_at)}</span>
                      {log.page && <span className="font-mono">{log.page}</span>}
                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-[10px] uppercase font-black">{log.source}</span>
                      <span className="flex items-center gap-1">
                        <UserIcon size={10} />
                        {log.user_id ? names.get(log.user_id) || log.user_id.slice(0, 8) : "anonymous"}
                      </span>
                    </p>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="shrink-0 text-gray-400" /> : <ChevronDown size={16} className="shrink-0 text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    {log.stack && (
                      <pre className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl text-[11px] text-red-600 dark:text-red-400 overflow-x-auto border border-gray-100 dark:border-zinc-800 whitespace-pre-wrap break-all">
                        {log.stack}
                      </pre>
                    )}
                    {log.user_agent && (
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono break-all">{log.user_agent}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
