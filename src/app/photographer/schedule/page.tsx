"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Plus, Trash2, Calendar, Clock, AlertCircle, Sparkles, CalendarOff, Repeat } from "lucide-react";
import { useToast } from "@/components/Toast";
import {
  expandAvailability,
  minuteToHHMM,
  addDays,
  todayIn,
  utcToLocalDay,
  utcToLocalMinute,
  localToUtc,
  type AvailabilityRule,
  type SlotRow,
} from "@/lib/availability";

interface ExceptionRow {
  id: string;
  date: string; // YYYY-MM-DD (studio tz)
  start_minute: number | null; // null = whole day off
  end_minute: number | null;
}

// One hour as shown in the calendar/list. 'rule' hours come from a recurrence
// rule (delete = insert an exception), 'slot' hours are legacy
// availability_slots rows (delete = delete the row), 'booked' are real bookings.
interface DisplayHour {
  start_time: string; // UTC ISO
  end_time: string; // UTC ISO
  dayKey: string; // studio-tz YYYY-MM-DD
  startMinute: number;
  kind: "rule" | "slot" | "booked";
  slotId?: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DISPLAY_WINDOW_DAYS = 60;
const MAX_RULE_DAYS = 366;

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

// "Today" (YYYY-MM-DD) in the given timezone.
const todayInTz = (tz: string) => todayIn(tz);

const hhmmToMinute = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
  return h * 60 + m;
};

// Human summary of a rule's days: "Every day" or "Mon, Tue, Wed".
const daysSummary = (days: number[]) => {
  if (days.length === 7) return "Every day";
  return [...days].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(", ");
};

const formatShortDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function ScheduleManager() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [photographerTz, setPhotographerTz] = useState("Asia/Seoul");

  // New rule form state
  const [startDate, setStartDate] = useState(getTodayDate);
  const [repeatUntil, setRepeatUntil] = useState(() => addDays(getTodayDate(), 30));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
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
    setRepeatUntil(addDays(startDate, 30));
  }, [startDate]);

  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    try {
      // Fetch photographer timezone
      const { data: pProfile } = await supabase
        .from("photographer_profiles")
        .select("timezone")
        .eq("id", user.id)
        .maybeSingle();
      const tz = pProfile?.timezone || "Asia/Seoul";
      setPhotographerTz(tz);

      const fromDate = todayIn(tz);
      const toDate = addDays(fromDate, DISPLAY_WINDOW_DAYS);
      const windowStartIso = localToUtc(fromDate, 0, tz).toISOString();
      const windowEndIso = localToUtc(addDays(toDate, 1), 0, tz).toISOString();

      const [rulesRes, exceptionsRes, slotsRes] = await Promise.all([
        supabase
          .from("availability_rules")
          .select("id, photographer_id, days_of_week, start_minute, end_minute, valid_from, valid_until")
          .eq("photographer_id", user.id)
          .gte("valid_until", fromDate)
          .order("valid_from", { ascending: true }),
        supabase
          .from("availability_exceptions")
          .select("id, date, start_minute, end_minute")
          .eq("photographer_id", user.id)
          .gte("date", fromDate),
        supabase
          .from("availability_slots")
          .select("id, start_time, end_time, status")
          .eq("photographer_id", user.id)
          .gte("start_time", windowStartIso)
          .lt("start_time", windowEndIso)
          .order("start_time", { ascending: true }),
      ]);

      if (rulesRes.error) throw rulesRes.error;
      if (exceptionsRes.error) throw exceptionsRes.error;
      if (slotsRes.error) throw slotsRes.error;

      setRules((rulesRes.data || []) as AvailabilityRule[]);
      setExceptions((exceptionsRes.data || []) as ExceptionRow[]);
      setSlots((slotsRes.data || []) as SlotRow[]);
    } catch (err: any) {
      console.error("Error fetching availability:", err);
      setError("Failed to load availability.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // ── Compute displayed hours: rules + exceptions + legacy slots, plus booked ──
  const displayHours: DisplayHour[] = useMemo(() => {
    const fromDate = todayIn(photographerTz);
    const toDate = addDays(fromDate, DISPLAY_WINDOW_DAYS);

    const expanded = expandAvailability({
      rules,
      exceptions,
      slots,
      timezone: photographerTz,
      fromDate,
      toDate,
    });

    const hours: DisplayHour[] = expanded.map((s) => ({
      start_time: s.start_time,
      end_time: s.end_time,
      dayKey: s.dayKey,
      startMinute: s.startMinute,
      kind: s.source,
      slotId: s.slotId,
    }));

    // expandAvailability excludes booked hours — merge them in for display.
    for (const s of slots) {
      if (s.status !== "booked") continue;
      const dayKey = utcToLocalDay(s.start_time, photographerTz);
      if (dayKey < fromDate || dayKey > toDate) continue;
      hours.push({
        start_time: new Date(s.start_time).toISOString(),
        end_time: new Date(s.end_time).toISOString(),
        dayKey,
        startMinute: utcToLocalMinute(s.start_time, photographerTz),
        kind: "booked",
        slotId: s.id,
      });
    }

    return hours.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [rules, exceptions, slots, photographerTz]);

  // Group displayed hours by their studio-timezone day
  const hoursByDate: Record<string, DisplayHour[]> = {};
  displayHours.forEach((h) => {
    if (!hoursByDate[h.dayKey]) {
      hoursByDate[h.dayKey] = [];
    }
    hoursByDate[h.dayKey].push(h);
  });
  const sortedDates = Object.keys(hoursByDate).sort();

  // Whether today (studio tz) is fully marked off via a whole-day exception.
  const todayStr = todayInTz(photographerTz);
  const todayWholeDayException = exceptions.find(
    (ex) => ex.date === todayStr && ex.start_minute === null
  );
  const unavailableToday = !!todayWholeDayException;

  // ── Create a recurrence rule (replaces bulk slot-row creation) ──
  const handleAddRule = async (e: React.FormEvent) => {
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

      const start_minute = hhmmToMinute(startTime);
      const end_minute = hhmmToMinute(endTime);
      if (end_minute <= start_minute) {
        throw new Error("End time must be after the start time.");
      }

      if (!startDate) {
        throw new Error("Start date is required.");
      }
      const today = todayInTz(photographerTz);
      if (startDate < today) {
        throw new Error("Start date cannot be in the past.");
      }

      if (!repeatUntil) {
        throw new Error("Repeat until date is required.");
      }
      if (repeatUntil < startDate) {
        throw new Error("Repeat until date must be after or equal to the start date.");
      }
      if (repeatUntil > addDays(startDate, MAX_RULE_DAYS)) {
        throw new Error("A rule can cover at most one year. Create a new rule when this one ends.");
      }

      if (selectedDays.length === 0) {
        throw new Error("Select at least one day of the week.");
      }

      const { data, error: insertError } = await supabase
        .from("availability_rules")
        .insert({
          photographer_id: user.id,
          days_of_week: [...selectedDays].sort((a, b) => a - b),
          start_minute,
          end_minute,
          valid_from: startDate,
          valid_until: repeatUntil,
        })
        .select("id, photographer_id, days_of_week, start_minute, end_minute, valid_from, valid_until")
        .single();

      if (insertError) throw insertError;

      setRules(prev =>
        [...prev, data as AvailabilityRule].sort((a, b) => a.valid_from.localeCompare(b.valid_from))
      );

      // Reset fields
      setStartTime("");
      setEndTime("");
      showToast("Successfully set availability.", "success");

      // Notify admin
      const description = `Created availability rule: ${daysSummary(selectedDays)} ${minuteToHHMM(start_minute)}-${minuteToHHMM(end_minute)}, valid ${startDate} to ${repeatUntil}.`;
      await notifyScheduleChange("Created Availability Rule", description);
    } catch (err: any) {
      console.error("Error creating rule:", err);
      setError(err.message || "Failed to add availability.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete a recurrence rule ──
  const handleDeleteRule = async (rule: AvailabilityRule) => {
    if (!supabase) return;
    if (!confirm(`Delete this rule (${daysSummary(rule.days_of_week)} ${minuteToHHMM(rule.start_minute)}-${minuteToHHMM(rule.end_minute)})? All hours it generates will disappear from your public schedule. Booked sessions are not affected.`)) return;

    setActionLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("availability_rules")
        .delete()
        .eq("id", rule.id);

      if (deleteError) throw deleteError;

      setRules(prev => prev.filter(r => r.id !== rule.id));
      showToast("Rule deleted.", "success");
      await notifyScheduleChange(
        "Deleted Availability Rule",
        `Deleted rule: ${daysSummary(rule.days_of_week)} ${minuteToHHMM(rule.start_minute)}-${minuteToHHMM(rule.end_minute)}, valid ${rule.valid_from} to ${rule.valid_until}.`
      );
    } catch (err: any) {
      console.error("Error deleting rule:", err);
      showToast(err.message || "Failed to delete rule.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Mark an entire day unavailable (whole-day exception + legacy cleanup) ──
  const handleMarkUnavailable = async (targetDateStr: string) => {
    if (!user || !supabase) return;
    if (!confirm(`Are you sure you want to make ${targetDateStr} unavailable? All bookable hours on this day will be removed from your public schedule.`)) return;

    setActionLoading(true);
    setError(null);
    try {
      // 1. Whole-day exception silences any rule-generated hours on this date.
      const { data: exData, error: exError } = await supabase
        .from("availability_exceptions")
        .insert({
          photographer_id: user.id,
          date: targetDateStr,
          start_minute: null,
          end_minute: null,
        })
        .select("id, date, start_minute, end_minute")
        .single();

      let alreadyMarked = false;
      if (exError) {
        if ((exError as any).code === "23505") {
          alreadyMarked = true; // already marked unavailable — fine
        } else {
          throw exError;
        }
      } else if (exData) {
        setExceptions(prev => [...prev, exData as ExceptionRow]);
      }

      // 2. Legacy 'available' slot rows aren't affected by exceptions in the
      // DB (the expander blocks them for display, but delete them for real).
      const idsToDelete = slots
        .filter(slot => slot.status === "available" && utcToLocalDay(slot.start_time, photographerTz) === targetDateStr)
        .map(slot => slot.id);

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("availability_slots")
          .delete()
          .eq("photographer_id", user.id)
          .eq("status", "available")
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
        setSlots(prev => prev.filter(slot => !idsToDelete.includes(slot.id)));
      }

      if (alreadyMarked && idsToDelete.length === 0) {
        showToast(`${targetDateStr} is already marked as unavailable.`, "info");
        return;
      }

      showToast(`Successfully marked ${targetDateStr} as unavailable.`, "success");
      await notifyScheduleChange("Marked Date Unavailable", `Marked ${targetDateStr} as fully unavailable (whole-day exception; removed any remaining bookable hours).`);
    } catch (err: any) {
      console.error("Error marking unavailable:", err);
      showToast(err.message || "Failed to update unavailability.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Toggle "I'm unavailable today" off: remove today's whole-day exception ──
  const handleClearUnavailableToday = async () => {
    if (!user || !supabase || !todayWholeDayException) return;
    setActionLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("availability_exceptions")
        .delete()
        .eq("id", todayWholeDayException.id);

      if (deleteError) throw deleteError;

      setExceptions(prev => prev.filter(ex => ex.id !== todayWholeDayException.id));
      showToast("You are available again today (per your rules).", "success");
      await notifyScheduleChange("Cleared Unavailable Today", `Removed the whole-day exception for ${todayStr}; rule-based hours apply again.`);
    } catch (err: any) {
      console.error("Error clearing unavailability:", err);
      showToast(err.message || "Failed to update unavailability.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete a single displayed hour ──
  const handleDeleteHour = async (hour: DisplayHour) => {
    if (!user || !supabase) return;
    if (hour.kind === "booked") return;
    if (!confirm("Are you sure you want to remove this hour from your availability?")) return;

    try {
      if (hour.kind === "slot" && hour.slotId) {
        // Legacy availability_slots row → delete the row (guarded on status).
        const { data: deletedRows, error: deleteError } = await supabase
          .from("availability_slots")
          .delete()
          .eq("id", hour.slotId)
          .eq("status", "available") // Guard to prevent deleting booked slots
          .select("id");

        if (deleteError) throw deleteError;

        if (!deletedRows || deletedRows.length === 0) {
          // 0 rows deleted: the slot was just booked (or already gone). Refetch to show its real status.
          showToast("This slot was just booked and can no longer be removed.", "error");
          await fetchData();
          return;
        }

        setSlots(prev => prev.filter(s => s.id !== hour.slotId));
      } else {
        // Rule-generated hour → add an hour-off exception for that date.
        const { data: exData, error: exError } = await supabase
          .from("availability_exceptions")
          .insert({
            photographer_id: user.id,
            date: hour.dayKey,
            start_minute: hour.startMinute,
            end_minute: hour.startMinute + 60,
          })
          .select("id, date, start_minute, end_minute")
          .single();

        if (exError) {
          if ((exError as any).code === "23505") {
            showToast("This hour was already removed. Refreshing your schedule.", "info");
            await fetchData();
            return;
          }
          throw exError;
        }

        if (exData) setExceptions(prev => [...prev, exData as ExceptionRow]);
      }

      // Notify admin
      const slotDesc = `Removed available hour: ${new Date(hour.start_time).toLocaleString()} - ${new Date(hour.end_time).toLocaleString()}${hour.kind === "rule" ? " (exception to recurring rule)" : ""}`;
      await notifyScheduleChange("Removed Available Hour", slotDesc);
    } catch (err: any) {
      console.error("Error removing hour:", err);
      showToast("Failed to remove hour. Booked hours cannot be removed.", "error");
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

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const renderHourRow = (hour: DisplayHour, compact: boolean) => {
    const formatted = formatSlotDateTime(hour.start_time, hour.end_time);
    const isBooked = hour.kind === "booked";
    return (
      <div
        key={hour.start_time}
        className={
          compact
            ? "bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between gap-4"
            : "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 transition-all hover:border-gray-200 dark:hover:border-zinc-800"
        }
      >
        <div className="flex items-center gap-3">
          {compact ? (
            <Clock size={16} className="text-gray-400" />
          ) : (
            <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl">
              <Clock size={18} className="text-gray-400" />
            </div>
          )}
          <span className={compact ? "text-xs font-bold text-foreground dark:text-white" : "text-sm font-bold text-foreground dark:text-white"}>
            {formatted.timeStr}
          </span>
        </div>

        <div className={compact ? "flex items-center gap-2" : "flex items-center gap-3"}>
          <span
            className={`${compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-[10px]"} rounded font-black uppercase tracking-wider ${
              isBooked
                ? "bg-accent/15 text-black dark:text-accent border border-accent/20"
                : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800"
            }`}
          >
            {isBooked ? "Booked" : "Available"}
          </span>

          {!isBooked && (
            <button
              onClick={() => handleDeleteHour(hour)}
              className={compact ? "p-1 text-gray-400 hover:text-red-500 transition-colors" : "p-2 text-gray-400 hover:text-red-500 transition-colors"}
              title="Remove Hour"
            >
              <Trash2 size={compact ? 14 : 16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

      {/* Left Column: Create Rule Form */}
      <div className="md:col-span-5 space-y-6">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2.5 text-foreground dark:text-white">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
              <Sparkles size={16} />
            </span>
            Add Availability
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAddRule} className="space-y-4">
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
                  max={addDays(startDate, MAX_RULE_DAYS)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1.5">Days of Week</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, day) => {
                  const active = selectedDays.includes(day);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all ${
                        active
                          ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                          : "bg-gray-50 dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 border-gray-200 dark:border-zinc-800 hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
              This creates a recurring availability rule — one rule covers the whole period (up to 1 year), no per-hour database rows are created. Remove single hours or days later without touching the rule.
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
                  <span>Create Availability Rule</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Active Rules Card */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2.5 text-foreground dark:text-white">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
              <Repeat size={16} />
            </span>
            Active Rules
          </h2>

          {rules.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-zinc-500">No recurring rules yet. Create one above to open your schedule.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground dark:text-white">
                      {daysSummary(rule.days_of_week)} {minuteToHHMM(rule.start_minute)}&ndash;{minuteToHHMM(rule.end_minute)}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                      {formatShortDate(rule.valid_from)} &ndash; {formatShortDate(rule.valid_until)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule)}
                    disabled={actionLoading}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    title="Delete Rule"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">Marks the whole day off. Toggle off to restore your rules.</p>
            </div>
            <button
              type="button"
              disabled={actionLoading}
              onClick={async () => {
                if (actionLoading) return;
                if (unavailableToday) {
                  await handleClearUnavailableToday();
                } else {
                  await handleMarkUnavailable(todayStr);
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                unavailableToday ? "bg-accent" : "bg-gray-200 dark:bg-zinc-800"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  unavailableToday ? "translate-x-6" : "translate-x-1"
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

       {/* Right Column: Hours List */}
      <div className="md:col-span-7 space-y-4">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-foreground dark:text-white">
              Availability Calendar
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Your upcoming public booking hours (next {DISPLAY_WINDOW_DAYS} days). Times shown in studio timezone ({photographerTz}).</p>
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
        ) : displayHours.length === 0 && viewMode === "list" ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
            <Calendar size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">No Availability Set</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Create a rule on the left to allow users to reserve your hours.</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 hide-scrollbar">
            {sortedDates.map((dateStr) => {
              const dateHours = hoursByDate[dateStr];
              const formattedDate = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              return (
                <div key={dateStr} className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mt-2 mb-1.5">{formattedDate}</h3>
                  <div className="space-y-2">
                    {dateHours.map((hour) => renderHourRow(hour, false))}
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
                  const dayHours = hoursByDate[dateStr] || [];
                  const hasHours = dayHours.length > 0;

                  const calTodayStr = todayInTz(photographerTz);
                  const isPast = dateStr < calTodayStr;

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
                      {hasHours && (
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
                  {(hoursByDate[selectedCalendarDate] || []).length} Hours Set
                </span>
              </div>

              {(() => {
                const dayHours = hoursByDate[selectedCalendarDate] || [];
                if (dayHours.length === 0) {
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
                      {dayHours.map((hour) => renderHourRow(hour, true))}
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
