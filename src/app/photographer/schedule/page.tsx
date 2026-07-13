"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2, Calendar, Clock, AlertCircle, Sparkles, CalendarOff } from "lucide-react";
import { useToast } from "@/components/Toast";

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
  const [unavailableDate, setUnavailableDate] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();

  const fetchSlots = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    setError(null);
    setActionLoading(true);

    try {
      // Validate time is on the hour or half-hour (e.g. 18:00 or 18:30)
      const startParts = startTime.split(":");
      const endParts = endTime.split(":");
      if (startParts.length >= 2) {
        const startMin = parseInt(startParts[1], 10);
        if (startMin !== 0 && startMin !== 30) {
          throw new Error("Start time must be on the hour or half-hour (e.g. 18:00 or 18:30).");
        }
      }
      if (endParts.length >= 2) {
        const endMin = parseInt(endParts[1], 10);
        if (endMin !== 0 && endMin !== 30) {
          throw new Error("End time must be on the hour or half-hour (e.g. 18:00 or 18:30).");
        }
      }

      if (date) {
        const todayStr = new Date().toISOString().split("T")[0];
        if (date < todayStr) {
          throw new Error("Deadline date cannot be in the past.");
        }
      }

      const targetDeadline = date ? new Date(`${date}T23:59:59`) : null;
      const startDay = new Date();
      startDay.setHours(0, 0, 0, 0);

      const maxDays = 365;
      const endDay = new Date(startDay);
      if (targetDeadline) {
        endDay.setTime(targetDeadline.getTime());
      } else {
        endDay.setDate(endDay.getDate() + maxDays);
      }

      const slotsToInsert = [];
      const now = new Date();

      // Loop through each day from startDay to endDay
      let currentDay = new Date(startDay);
      while (currentDay <= endDay) {
        const yyyy = currentDay.getFullYear();
        const mm = String(currentDay.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDay.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const dayStartDateTime = new Date(`${dateStr}T${startTime}`);
        const dayEndDateTime = new Date(`${dateStr}T${endTime}`);

        if (!isNaN(dayStartDateTime.getTime()) && !isNaN(dayEndDateTime.getTime())) {
          if (dayStartDateTime > now && dayEndDateTime > dayStartDateTime) {
            let currentStart = new Date(dayStartDateTime);
            while (currentStart < dayEndDateTime) {
              const currentEnd = new Date(currentStart);
              currentEnd.setHours(currentEnd.getHours() + 1);

              if (currentEnd > dayEndDateTime) {
                break; // only create full hour-by-hour slots
              }

              // Check overlapping slots locally
              const overlaps = slots.some(slot => {
                const s = new Date(slot.start_time);
                const e = new Date(slot.end_time);
                return (currentStart < e && currentEnd > s);
              });

              if (!overlaps) {
                slotsToInsert.push({
                  photographer_id: user.id,
                  start_time: currentStart.toISOString(),
                  end_time: currentEnd.toISOString(),
                  status: "available",
                });
              }

              currentStart = currentEnd;
            }
          }
        }
        currentDay.setDate(currentDay.getDate() + 1);
      }

      if (slotsToInsert.length === 0) {
        throw new Error("No new slots to create. Make sure you set a future time and they don't overlap with existing slots.");
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

      // Reset fields
      setStartTime("");
      setEndTime("");
      setDate("");
      showToast(`Successfully created ${insertedSlots.length} slot(s).`, "success");
    } catch (err: any) {
      console.error("Error creating slot:", err);
      setError(err.message || "Failed to add availability slot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkUnavailable = async (targetDateStr: string) => {
    if (!user || !supabase) return;
    if (!confirm(`Are you sure you want to make ${targetDateStr} unavailable? This will delete all available slots on this day.`)) return;

    setActionLoading(true);
    setError(null);
    try {
      const startOfDay = new Date(`${targetDateStr}T00:00:00`);
      const endOfDay = new Date(`${targetDateStr}T23:59:59.999`);

      const { error: deleteError } = await supabase
        .from("availability_slots")
        .delete()
        .eq("photographer_id", user.id)
        .eq("status", "available")
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());

      if (deleteError) throw deleteError;

      // Update state
      setSlots(prev => prev.filter(slot => {
        const slotDate = new Date(slot.start_time);
        return !(slotDate >= startOfDay && slotDate <= endOfDay);
      }));

      showToast(`Successfully marked ${targetDateStr} as unavailable.`, "success");
    } catch (err: any) {
      console.error("Error marking unavailable:", err);
      showToast(err.message || "Failed to update unavailability.", "error");
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
      showToast("Failed to delete slot. Booked slots cannot be deleted.", "error");
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
          <h2 className="text-xl font-black mb-4 flex items-center gap-2.5 text-foreground dark:text-white">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
              <Sparkles size={16} />
            </span>
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
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Date / Repeat Until (Optional)</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
              />
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1.5">
                If left blank, availability repeats daily forever (365 days). If set, repeats daily until this date.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Start Time</label>
                <input
                  type="time"
                  required
                  step="1800"
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
                  step="1800"
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

        {/* Manage Unavailability Card */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2.5 text-foreground dark:text-white">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
              <CalendarOff size={16} />
            </span>
            Manage Unavailability
          </h2>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-foreground dark:text-white font-black">I&apos;m unavailable today</p>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">Quickly remove today&apos;s available slots</p>
            </div>
            <button
              type="button"
              disabled={actionLoading}
              onClick={async () => {
                if (actionLoading) return;
                const todayStr = new Date().toISOString().split("T")[0];
                const hasSlots = slots.some(slot => {
                  const slotDate = slot.start_time.split("T")[0];
                  return slotDate === todayStr && slot.status === "available";
                });
                if (!hasSlots) {
                  showToast("To add available hours for today, use the form above.", "info");
                  return;
                }
                await handleMarkUnavailable(todayStr);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                !slots.some(slot => {
                  const slotDate = slot.start_time.split("T")[0];
                  return slotDate === new Date().toISOString().split("T")[0] && slot.status === "available";
                }) ? "bg-accent" : "bg-gray-200 dark:bg-zinc-800"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  !slots.some(slot => {
                    const slotDate = slot.start_time.split("T")[0];
                    return slotDate === new Date().toISOString().split("T")[0] && slot.status === "available";
                  }) ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Mark Specific Date Unavailable</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={unavailableDate}
                onChange={(e) => setUnavailableDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="flex-1 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-2 px-3 text-sm outline-none text-foreground dark:text-white"
              />
              <button
                type="button"
                disabled={actionLoading || !unavailableDate}
                onClick={() => {
                  if (unavailableDate) {
                    handleMarkUnavailable(unavailableDate);
                    setUnavailableDate("");
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center"
              >
                Mark
              </button>
            </div>
          </div>
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
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Add slots on the left to allow users to reserve your hours.</p>
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
