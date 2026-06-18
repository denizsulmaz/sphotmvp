"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2, Calendar, Clock, AlertCircle, Sparkles } from "lucide-react";

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  status: "available" | "booked";
}

export default function ScheduleManager() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  // New slot form state
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSlots = async () => {
    if (!user || !supabase) return;
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("photographer_id", user.id)
        .gt("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (dbError) throw dbError;
      setSlots((data || []) as AvailabilitySlot[]);
    } catch (err: any) {
      console.error("Error fetching slots:", err);
      setError("Failed to load availability slots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [user]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    setError(null);
    setActionLoading(true);

    try {
      // Build ISO datetimes
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error("Invalid date or time values.");
      }

      if (startDateTime <= new Date()) {
        throw new Error("Slots must be in the future.");
      }

      if (endDateTime <= startDateTime) {
        throw new Error("End time must be after start time.");
      }

      // Check overlapping slots locally (or let DB handle it)
      const isOverlapping = slots.some(slot => {
        const s = new Date(slot.start_time);
        const e = new Date(slot.end_time);
        return (startDateTime < e && endDateTime > s);
      });

      if (isOverlapping) {
        throw new Error("This slot range overlaps with an existing availability slot.");
      }

      const slotsToInsert = [];
      let currentStart = new Date(startDateTime);
      while (currentStart < endDateTime) {
        const currentEnd = new Date(currentStart);
        currentEnd.setHours(currentEnd.getHours() + 1);

        if (currentEnd > endDateTime) {
          break; // only create full hour-by-hour slots
        }

        slotsToInsert.push({
          photographer_id: user.id,
          start_time: currentStart.toISOString(),
          end_time: currentEnd.toISOString(),
          status: "available",
        });

        currentStart = currentEnd;
      }

      if (slotsToInsert.length === 0) {
        throw new Error("Availability range must be at least 1 hour.");
      }

      const { data, error: insertError } = await supabase
        .from("availability_slots")
        .insert(slotsToInsert)
        .select();

      if (insertError) throw insertError;

      const insertedSlots = (data || []) as AvailabilitySlot[];

      // Add to list and sort
      setSlots(prev => 
        [...prev, ...insertedSlots].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
      );

      // Reset time fields
      setStartTime("");
      setEndTime("");
    } catch (err: any) {
      console.error("Error creating slot:", err);
      setError(err.message || "Failed to add availability slot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!supabase) return;
    if (!confirm("Are you sure you want to delete this availability slot?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("availability_slots")
        .delete()
        .eq("id", slotId)
        .eq("status", "available"); // Guard to prevent deleting booked slots

      if (deleteError) throw deleteError;

      // Update state
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err: any) {
      console.error("Error deleting slot:", err);
      alert("Failed to delete slot. Booked slots cannot be deleted.");
    }
  };

  // Helper formatting
  const formatSlotDateTime = (isoStart: string, isoEnd: string) => {
    const start = new Date(isoStart);
    const end = new Date(isoEnd);
    const dateStr = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timeStr = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return { dateStr, timeStr };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      
      {/* Left Column: Create Slot Form */}
      <div className="md:col-span-5 space-y-6">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-foreground dark:text-white">
            <Sparkles className="text-accent" size={20} />
            Add Availability Slot
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAddSlot} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black font-black rounded-xl text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <span className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus size={16} />
                  <span>Create Available Hour</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Slots List */}
      <div className="md:col-span-7 space-y-4">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-xl font-black text-foreground dark:text-white mb-2">Availability Calendar</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500">Your upcoming public booking hours.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : slots.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
            <Calendar size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">No Slots Created</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Add slots on the left to allow clients to reserve your hours.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 hide-scrollbar">
            {slots.map((slot) => {
              const formatted = formatSlotDateTime(slot.start_time, slot.end_time);
              return (
                <div
                  key={slot.id}
                  className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 transition-all hover:border-gray-200 dark:hover:border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl">
                      <Clock size={18} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{formatted.dateStr}</p>
                      <p className="text-sm font-bold text-foreground dark:text-white mt-0.5">{formatted.timeStr}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        slot.status === "booked"
                          ? "bg-accent/15 text-black dark:text-accent border border-accent/20"
                          : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800"
                      }`}
                    >
                      {slot.status}
                    </span>

                    {slot.status === "available" && (
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete Slot"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
