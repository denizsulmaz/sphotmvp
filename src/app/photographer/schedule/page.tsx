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

const timeOptions = Array.from({ length: 48 }, (_, idx) => {
  const hour = Math.floor(idx / 2);
  const minutes = idx % 2 === 0 ? "00" : "30";
  const formattedHour = String(hour).padStart(2, "0");
  return `${formattedHour}:${minutes}`;
});

const getLocalDateString = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getTodayDate = () => {
  return getLocalDateString(new Date());
};

// Returns the YYYY-MM-DD day key of an ISO timestamp as seen in the given IANA timezone.
// en-CA locale formats dates as YYYY-MM-DD, matching our day-key convention.
const slotDayKey = (isoString: string, tz: string) => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString.split("T")[0]; // fallback: UTC date
  }
};

// "Today" (YYYY-MM-DD) in the given timezone.
const todayInTz = (tz: string) => slotDayKey(new Date().toISOString(), tz);

const get30DaysLaterDate = (startDateStr: string) => {
  const parts = startDateStr.split("-");
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + 30);
  return getLocalDateString(d);
};

export default function ScheduleManager() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [photographerTz, setPhotographerTz] = useState("Asia/Seoul");

  // New slot form state
  const [startDate, setStartDate] = useState(getTodayDate);
  const [repeatUntil, setRepeatUntil] = useState(() => get30DaysLaterDate(getTodayDate()));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [unavailableDate, setUnavailableDate] = useState("");
  
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => getTodayDate());
  
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay();
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }
    
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    const totalCells = days.length;
    const nextPadding = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= nextPadding; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const calendarCells = getDaysInMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Sync repeatUntil date when startDate changes to default to 30 days later
  useEffect(() => {
    setRepeatUntil(get30DaysLaterDate(startDate));
  }, [startDate]);
  
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();

  const fetchSlots = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    try {
      // Fetch photographer timezone
      const { data: pProfile } = await supabase
        .from("photographer_profiles")
        .select("timezone")
        .eq("id", user.id)
        .maybeSingle();
      if (pProfile?.timezone) setPhotographerTz(pProfile.timezone);

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

  const notifyScheduleChange = async (action: string, slotsDescription: string) => {
    if (!user || !supabase) return;
    try {
      const { data: pData } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      const fullName = pData?.full_name || user.email || "Unknown";

      const { data: sessionData } = await supabase.auth.getSession();
      const access_token = sessionData.session?.access_token;
      if (access_token) {
        await fetch("/api/notify/transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token,
            type: "photographer_availability",
            details: {
              fullName,
              action,
              slotsDescription,
            },
          }),
        });
      }
    } catch (err) {
      console.error("notifyScheduleChange error:", err);
    }
  };

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

      if (!startDate) {
        throw new Error("Start date is required.");
      }
      const todayStr = todayInTz(photographerTz);
      if (startDate < todayStr) {
        throw new Error("Start date cannot be in the past.");
      }

      if (!repeatUntil) {
        throw new Error("Repeat until date is required.");
      }
      if (repeatUntil < startDate) {
        throw new Error("Repeat until date must be after or equal to the start date.");
      }

      const maxLimit = get30DaysLaterDate(startDate);
      if (repeatUntil > maxLimit) {
        throw new Error("Repeat duration cannot exceed 30 days to ensure performance.");
      }

      const startDay = new Date(`${startDate}T00:00:00`);
      const endDay = new Date(`${repeatUntil}T23:59:59`);

      const slotsToInsert = [];
      const now = new Date();

      // Loop through each day from startDay to endDay
      let currentDay = new Date(startDay);
      while (currentDay <= endDay) {
        const yyyy = currentDay.getFullYear();
        const mm = String(currentDay.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDay.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        // Build timezone-aware date strings using the photographer's timezone.
        // Create a date in the photographer's local time by formatting with their tz,
        // then use the IANA timezone for accurate offset resolution.
        const tzOffset = (() => {
          try {
            // Get the UTC offset for the photographer's timezone on this specific date
            const probe = new Date(`${dateStr}T12:00:00Z`);
            const utcStr = probe.toLocaleString('en-US', { timeZone: 'UTC' });
            const tzStr = probe.toLocaleString('en-US', { timeZone: photographerTz });
            const diffMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
            const diffHours = Math.floor(Math.abs(diffMs) / 3600000);
            const diffMinutes = Math.floor((Math.abs(diffMs) % 3600000) / 60000);
            const sign = diffMs >= 0 ? '+' : '-';
            return `${sign}${String(diffHours).padStart(2,'0')}:${String(diffMinutes).padStart(2,'0')}`;
          } catch {
            return '+09:00'; // fallback to KST
          }
        })();
        const dayStartDateTime = new Date(`${dateStr}T${startTime}:00${tzOffset}`);
        const dayEndDateTime = new Date(`${dateStr}T${endTime}:00${tzOffset}`);

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
      showToast("Successfully set availability.", "success");

      // Notify admin
      const count = slotsToInsert.length;
      const slotsDescription = `Created ${count} hourly slot(s) between ${startTime} and ${endTime} repeating daily from ${startDate} until ${repeatUntil}.`;
      await notifyScheduleChange("Created Slots", slotsDescription);
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
      // Select exactly the slots displayed under this day (studio timezone), so
      // "mark this day unavailable" deletes precisely what the photographer sees.
      const idsToDelete = slots
        .filter(slot => slot.status === "available" && slotDayKey(slot.start_time, photographerTz) === targetDateStr)
        .map(slot => slot.id);

      if (idsToDelete.length === 0) {
        showToast(`No available slots found on ${targetDateStr}.`, "info");
        return;
      }

      const { error: deleteError } = await supabase
        .from("availability_slots")
        .delete()
        .eq("photographer_id", user.id)
        .eq("status", "available")
        .in("id", idsToDelete);

      if (deleteError) throw deleteError;

      // Update state
      setSlots(prev => prev.filter(slot => !idsToDelete.includes(slot.id)));

      showToast(`Successfully marked ${targetDateStr} as unavailable.`, "success");

      // Notify admin
      await notifyScheduleChange("Marked Date Unavailable", `Marked ${targetDateStr} as unavailable (deleted any available slots on this day).`);
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
      const { data: deletedRows, error: deleteError } = await supabase
        .from("availability_slots")
        .delete()
        .eq("id", slotId)
        .eq("status", "available") // Guard to prevent deleting booked slots
        .select("id");

      if (deleteError) throw deleteError;

      if (!deletedRows || deletedRows.length === 0) {
        // 0 rows deleted: the slot was just booked (or already gone). Refetch to show its real status.
        showToast("This slot was just booked and can no longer be removed.", "error");
        await fetchSlots();
        return;
      }

      // Notify admin
      const matched = slots.find(s => s.id === slotId);
      const slotDesc = matched 
        ? `Deleted available slot: ${new Date(matched.start_time).toLocaleString()} - ${new Date(matched.end_time).toLocaleString()}`
        : `Deleted availability slot (ID: ${slotId})`;
      await notifyScheduleChange("Deleted Slot", slotDesc);

      // Update state
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err: any) {
      console.error("Error deleting slot:", err);
      showToast("Failed to delete slot. Booked slots cannot be deleted.", "error");
    }
  };

  // Helper formatting — pinned to the studio timezone so photographers see the
  // same times clients see at checkout (mirrors formatInTz in CheckoutClient).
  const formatInTz = (isoString: string, formatOptions: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        ...formatOptions,
        timeZone: photographerTz,
      }).format(new Date(isoString));
    } catch (e) {
      console.error("Timezone formatting error, falling back to local:", e);
      return new Intl.DateTimeFormat("en-US", formatOptions).format(new Date(isoString));
    }
  };

  const formatSlotDateTime = (isoStart: string, isoEnd: string) => {
    const dateStr = formatInTz(isoStart, { weekday: "short", month: "short", day: "numeric" });
    const timeStr = `${formatInTz(isoStart, { hour: "2-digit", minute: "2-digit" })} - ${formatInTz(isoEnd, { hour: "2-digit", minute: "2-digit" })}`;
    return { dateStr, timeStr };
  };

  // Group slots by their studio-timezone day for display
  const slotsByDate: Record<string, AvailabilitySlot[]> = {};
  slots.forEach((s) => {
    const dStr = slotDayKey(s.start_time, photographerTz);
    if (!slotsByDate[dStr]) {
      slotsByDate[dStr] = [];
    }
    slotsByDate[dStr].push(s);
  });
  const sortedDates = Object.keys(slotsByDate).sort();

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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={todayInTz(photographerTz)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Repeat Until</label>
                <input
                  type="date"
                  required
                  value={repeatUntil}
                  onChange={(e) => setRepeatUntil(e.target.value)}
                  min={startDate}
                  max={get30DaysLaterDate(startDate)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
              Note: To keep database performance optimal, scheduling repeats is pre-set to 30 days (1 month) by default.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Start Time</label>
                <select
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3.5 px-4 text-sm outline-none text-foreground dark:text-white appearance-none"
                >
                  <option value="" disabled>Select Time</option>
                  {timeOptions.map((t) => (
                    <option key={`start-${t}`} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">End Time</label>
                <select
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3.5 px-4 text-sm outline-none text-foreground dark:text-white appearance-none"
                >
                  <option value="" disabled>Select Time</option>
                  {timeOptions.map((t) => (
                    <option key={`end-${t}`} value={t}>{t}</option>
                  ))}
                </select>
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
                const todayStr = todayInTz(photographerTz);
                const hasSlots = slots.some(slot => {
                  const slotDate = slotDayKey(slot.start_time, photographerTz);
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
                  const slotDate = slotDayKey(slot.start_time, photographerTz);
                  return slotDate === todayInTz(photographerTz) && slot.status === "available";
                }) ? "bg-accent" : "bg-gray-200 dark:bg-zinc-800"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  !slots.some(slot => {
                    const slotDate = slotDayKey(slot.start_time, photographerTz);
                    return slotDate === todayInTz(photographerTz) && slot.status === "available";
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
                min={todayInTz(photographerTz)}
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
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-foreground dark:text-white">
              Availability Calendar
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Your upcoming public booking hours. Times shown in studio timezone ({photographerTz}).</p>
          </div>
          <div className="flex bg-gray-50 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-xl p-1 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === "list"
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                  : "text-gray-500 dark:text-zinc-400 hover:text-foreground"
              }`}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === "calendar"
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                  : "text-gray-500 dark:text-zinc-400 hover:text-foreground"
              }`}
            >
              Day View
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : slots.length === 0 && viewMode === "list" ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
            <Calendar size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">No Slots Created</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Add slots on the left to allow users to reserve your hours.</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 hide-scrollbar">
            {sortedDates.map((dateStr) => {
              const dateSlots = slotsByDate[dateStr];
              const formattedDate = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              return (
                <div key={dateStr} className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mt-2 mb-1.5">{formattedDate}</h3>
                  <div className="space-y-2">
                    {dateSlots.map((slot) => {
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
                </div>
              );
            })}
          </div>
        ) : (
          /* Month Calendar View */
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground dark:text-white">
                  {monthNames[currentMonth]} {currentYear}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-gray-500 hover:text-foreground font-black text-sm"
                  >
                    &larr;
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-gray-500 hover:text-foreground font-black text-sm"
                  >
                    &rarr;
                  </button>
                </div>
              </div>

              {/* Day names header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Grid cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, idx) => {
                  const dateStr = getLocalDateString(cell.date);
                  const isSelected = selectedCalendarDate === dateStr;
                  const daySlots = slotsByDate[dateStr] || [];
                  const hasSlots = daySlots.length > 0;
                  
                  const todayStr = todayInTz(photographerTz);
                  const isPast = dateStr < todayStr;
                  
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedCalendarDate(dateStr)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all relative ${
                        isSelected
                          ? "border-black bg-black text-accent font-black shadow-sm dark:border-zinc-800"
                          : !cell.isCurrentMonth
                          ? "border-transparent bg-transparent text-gray-300 dark:text-zinc-700 opacity-30"
                          : isPast
                          ? "border-transparent bg-transparent text-gray-400 dark:text-zinc-600 opacity-60"
                          : "border-gray-50 dark:border-zinc-900/50 bg-gray-50/50 dark:bg-zinc-900/20 text-gray-700 dark:text-zinc-300 hover:border-gray-200 dark:hover:border-zinc-800"
                      }`}
                    >
                      <span className="text-xs font-black">
                        {cell.date.getDate()}
                      </span>
                      {hasSlots && (
                        <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-accent' : 'bg-black dark:bg-accent'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground dark:text-white">
                  Schedule for {new Date(`${selectedCalendarDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </h3>
                <span className="text-xs font-black px-2 py-0.5 rounded bg-gray-50 dark:bg-zinc-900 text-gray-500 border border-gray-100 dark:border-zinc-800">
                  {(slotsByDate[selectedCalendarDate] || []).length} Hours Set
                </span>
              </div>

              {(() => {
                const daySlots = slotsByDate[selectedCalendarDate] || [];
                if (daySlots.length === 0) {
                  return (
                    <div className="py-8 text-center space-y-4">
                      <p className="text-xs text-gray-400 dark:text-zinc-500">No active hours set for this date.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate(selectedCalendarDate);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-black rounded-xl text-xs hover:opacity-90 transition-all inline-flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>Add Hours for This Date</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                      {daySlots.map((slot) => {
                        const formatted = formatSlotDateTime(slot.start_time, slot.end_time);
                        return (
                          <div
                            key={slot.id}
                            className="bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <Clock size={16} className="text-gray-400" />
                              <span className="text-xs font-bold text-foreground dark:text-white">{formatted.timeStr}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  slot.status === "booked"
                                    ? "bg-accent/15 text-black dark:text-accent border border-accent/20"
                                    : "bg-white text-gray-500 dark:bg-zinc-950 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800"
                                }`}
                              >
                                {slot.status}
                              </span>
                              {slot.status === "available" && (
                                <button
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Delete Slot"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleMarkUnavailable(selectedCalendarDate)}
                      className="w-full py-2.5 bg-red-50 hover:bg-red-100/50 dark:bg-red-950/10 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-bold border border-red-100/80 dark:border-red-950/20 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CalendarOff size={14} />
                      <span>Mark Date as Unavailable</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
