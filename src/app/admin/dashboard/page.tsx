"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Check, X, ShieldAlert, Sparkles, TrendingUp, Users, Calendar } from "lucide-react";

interface PendingPhotographer {
  id: string;
  bio: string;
  base_price: number;
  locations: string[];
  categories: string[];
  profiles: {
    full_name: string;
    avatar_url: string;
  } | null;
}

export default function AdminDashboard() {
  const [pendingPhotographers, setPendingPhotographers] = useState<PendingPhotographer[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAdminData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Fetch pending photographers
      const { data: dbPending, error: pendingError } = await supabase
        .from("photographer_profiles")
        .select(`
          id,
          bio,
          base_price,
          locations,
          categories,
          profiles:id (
            full_name,
            avatar_url
          )
        `)
        .eq("is_approved", false);

      if (pendingError) throw pendingError;
      setPendingPhotographers((dbPending || []) as any[]);

      // 2. Fetch stats
      const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true });

      const { count: paidBookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "paid");

      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      setStats({
        totalBookings: bookingsCount || 0,
        totalRevenue: (paidBookingsCount || 0) * 25000,
        activeUsers: usersCount || 0,
      });

    } catch (err) {
      console.error("Error loading admin dashboard stats/profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApprove = async (id: string) => {
    if (!supabase) return;
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from("photographer_profiles")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      
      // Update local state
      setPendingPhotographers(prev => prev.filter(p => p.id !== id));
      
      // Update stats if approval changes profiles count
      setStats(prev => ({ ...prev, activeUsers: prev.activeUsers }));
    } catch (err) {
      console.error("Failed to approve photographer:", err);
      alert("Error approving photographer profile.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Overview Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-accent/10 rounded-2xl">
            <TrendingUp size={22} className="text-black dark:text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Platform Revenue</p>
            <p className="text-xl font-black text-foreground dark:text-white mt-1">
              {stats.totalRevenue.toLocaleString()} KRW
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-accent/10 rounded-2xl">
            <Users size={22} className="text-black dark:text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Registered Users</p>
            <p className="text-xl font-black text-foreground dark:text-white mt-1">{stats.activeUsers}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-accent/10 rounded-2xl">
            <Calendar size={22} className="text-black dark:text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Total Bookings</p>
            <p className="text-xl font-black text-foreground dark:text-white mt-1">{stats.totalBookings}</p>
          </div>
        </div>
      </div>

      {/* Approvals Queue */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-xl font-black text-foreground dark:text-white flex items-center gap-2">
            <Sparkles size={20} className="text-accent" />
            Verification Queue
          </h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Photographer profiles pending approval. Approvals are due in 3 business days.</p>
        </div>

        {pendingPhotographers.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
            <ShieldAlert size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">Verification Queue Empty</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">No photographers require approval at this moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPhotographers.map((photo) => (
              <div
                key={photo.id}
                className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                
                {/* Photographer Details */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                    <img
                      src={photo.profiles?.avatar_url || "/media/default-profile.webp"}
                      alt={photo.profiles?.full_name || "Photographer"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div>
                      <h3 className="text-base font-black text-foreground dark:text-white leading-tight">
                        {photo.profiles?.full_name || "Unknown Photographer"}
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold mt-0.5">
                        Base pricing: {photo.base_price?.toLocaleString()} KRW/Hour
                      </p>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                      {photo.bio || "No biography provided."}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {photo.locations?.map((loc) => (
                        <span key={loc} className="px-2 py-0.5 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 rounded text-[10px] font-bold">
                          {loc}
                        </span>
                      ))}
                      {photo.categories?.map((cat) => (
                        <span key={cat} className="px-2 py-0.5 bg-accent/15 border border-accent/20 text-black dark:text-white rounded text-[10px] font-black">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Approve Button */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(photo.id)}
                    disabled={actionLoading === photo.id}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black font-black text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all"
                  >
                    <Check size={16} />
                    <span>Approve Studio</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
