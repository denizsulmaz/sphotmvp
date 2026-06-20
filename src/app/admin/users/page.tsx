"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search } from "lucide-react";

interface ClientRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, created_at")
        .eq("role", "client")
        .order("created_at", { ascending: false });
      setClients((data || []) as ClientRow[]);
    } catch (err) {
      console.error("admin users load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.full_name?.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground dark:text-white flex items-center gap-2.5">
            Registered Users {clients.length > 0 && <span className="text-sm text-gray-400">({clients.length})</span>}
          </h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Users who signed up to book photographers.</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name"
            className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs outline-none text-foreground dark:text-white w-full sm:w-56" />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
          <Users size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-lg font-black text-foreground dark:text-white">No users</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">No registered user accounts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.avatar_url || "/media/default-profile.webp"} alt={c.full_name || "User"} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-foreground dark:text-white truncate">{c.full_name || "Unnamed user"}</h3>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold mt-0.5">
                  Joined {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
