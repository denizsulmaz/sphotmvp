"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  TrendingUp,
  Wallet,
  XCircle,
  CalendarRange,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type BookingStatus =
  | "pending"
  | "paid"
  | "confirmed"
  | "completed"
  | "cancelled";

interface BookingMetricRow {
  id: string;
  status: BookingStatus | null;
  fee_krw: number | null;
  created_at: string | null;
}

interface SlotEmbed {
  start_time: string | null;
  end_time: string | null;
}

interface PhotographerEmbed {
  full_name: string | null;
}

interface SessionRow {
  id: string;
  status: BookingStatus | null;
  shoot_location: string | null;
  photographer_id: string | null;
  availability_slots: SlotEmbed | SlotEmbed[] | null;
  photographer: PhotographerEmbed | PhotographerEmbed[] | null;
}

interface PhotographerLocationsRow {
  id: string;
  public_code: string | null;
  locations: string[] | null;
  is_approved: boolean | null;
}

interface Session {
  id: string;
  status: BookingStatus;
  shootLocation: string;
  photographerName: string;
  publicCode: string | null;
  start: Date | null;
  end: Date | null;
}

interface LocationStat {
  location: string;
  count: number;
}

type CalendarView = "day" | "week" | "month";

/* --------------------------- Date helpers --------------------------- */

const MS_DAY = 86_400_000;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

/** Monday as the first day of the week. */
function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const day = c.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  c.setDate(c.getDate() - diff);
  return c;
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  return endOfDay(new Date(start.getTime() + 6 * MS_DAY));
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

/* ----------------------------- Component ----------------------------- */

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20",
  paid: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20",
  confirmed:
    "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200/60 dark:border-violet-500/20",
  completed:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20",
  cancelled:
    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20",
};

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

const CARD =
  "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm";

export default function OperationsView() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<BookingMetricRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);

  const [view, setView] = useState<CalendarView>("day");
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        /* 1. Metrics — all bookings, aggregated in JS. */
        const { data: metricRows, error: metricErr } = await supabase
          .from("bookings")
          .select("id,status,fee_krw,created_at");
        if (metricErr) throw metricErr;
        setMetrics((metricRows || []) as BookingMetricRow[]);

        /* 2. Active locations — approved photographers' location arrays. */
        const { data: photoRows, error: photoErr } = await supabase
          .from("photographer_profiles")
          .select("id,public_code,locations,is_approved");
        if (photoErr) throw photoErr;

        const photographers = (photoRows || []) as PhotographerLocationsRow[];

        const locCounts = new Map<string, number>();
        for (const p of photographers) {
          if (!p.is_approved) continue;
          const locs = Array.isArray(p.locations) ? p.locations : [];
          const seen = new Set<string>();
          for (const raw of locs) {
            const loc = (raw || "").trim();
            if (!loc || seen.has(loc)) continue;
            seen.add(loc);
            locCounts.set(loc, (locCounts.get(loc) || 0) + 1);
          }
        }
        setLocationStats(
          Array.from(locCounts.entries())
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location))
        );

        /* public_code lookup keyed by photographer id. */
        const codeById = new Map<string, string | null>();
        for (const p of photographers) codeById.set(p.id, p.public_code);

        /* 3. Sessions — booked slots that are paid/confirmed/completed. */
        const { data: sessionRows, error: sessionErr } = await supabase
          .from("bookings")
          .select(
            `id,
             status,
             shoot_location,
             photographer_id,
             availability_slots ( start_time, end_time ),
             photographer:profiles!bookings_photographer_id_fkey ( full_name )`
          )
          .not("slot_id", "is", null)
          .in("status", ["paid", "confirmed", "completed"]);
        if (sessionErr) throw sessionErr;

        const mapped: Session[] = ((sessionRows || []) as SessionRow[]).map(
          (row) => {
            const slot = firstOf(row.availability_slots);
            const photographer = firstOf(row.photographer);
            return {
              id: row.id,
              status: (row.status || "paid") as BookingStatus,
              shootLocation: row.shoot_location || "Location TBD",
              photographerName:
                photographer?.full_name || "Unknown Photographer",
              publicCode: row.photographer_id
                ? codeById.get(row.photographer_id) ?? null
                : null,
              start: safeDate(slot?.start_time),
              end: safeDate(slot?.end_time),
            };
          }
        );

        setSessions(
          mapped
            .filter((s) => s.start !== null)
            .sort((a, b) => (a.start!.getTime() - b.start!.getTime()))
        );
      } catch (err) {
        console.error("Failed to load operations data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* --------------------------- Derived metrics --------------------------- */

  const summary = useMemo(() => {
    let total = 0;
    let paid = 0;
    let completed = 0;
    let cancelled = 0;
    let revenue = 0;
    for (const b of metrics) {
      total += 1;
      const s = b.status;
      if (s === "paid") paid += 1;
      if (s === "completed") completed += 1;
      if (s === "cancelled") cancelled += 1;
      if (s === "paid" || s === "confirmed" || s === "completed") {
        revenue += b.fee_krw ?? 0;
      }
    }
    return { total, paid, completed, cancelled, revenue };
  }, [metrics]);

  /* --------------------------- Calendar window --------------------------- */

  const { rangeStart, rangeEnd, periodLabel } = useMemo(() => {
    if (view === "day") {
      return {
        rangeStart: startOfDay(cursor),
        rangeEnd: endOfDay(cursor),
        periodLabel: fmtDayLabel(cursor),
      };
    }
    if (view === "week") {
      const ws = startOfWeek(cursor);
      const we = endOfWeek(cursor);
      return {
        rangeStart: ws,
        rangeEnd: we,
        periodLabel: `${ws.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })} – ${we.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`,
      };
    }
    return {
      rangeStart: startOfMonth(cursor),
      rangeEnd: endOfMonth(cursor),
      periodLabel: cursor.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    };
  }, [view, cursor]);

  const visibleSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (!s.start) return false;
      const t = s.start.getTime();
      return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
    });
  }, [sessions, rangeStart, rangeEnd]);

  /** Sessions grouped by calendar day for week/month agenda views. */
  const groupedDays = useMemo(() => {
    if (view === "day") return [];
    const days: { date: Date; items: Session[] }[] = [];
    const startMs = startOfDay(rangeStart).getTime();
    const dayCount =
      Math.round((startOfDay(rangeEnd).getTime() - startMs) / MS_DAY) + 1;
    for (let i = 0; i < dayCount; i++) {
      const date = new Date(startMs + i * MS_DAY);
      const items = visibleSessions.filter(
        (s) => s.start && sameDay(s.start, date)
      );
      days.push({ date, items });
    }
    // Month view: only show days that have sessions to keep it clean.
    if (view === "month") return days.filter((d) => d.items.length > 0);
    return days;
  }, [view, rangeStart, rangeEnd, visibleSessions]);

  const shiftPeriod = (dir: -1 | 1) => {
    setCursor((prev) => {
      const c = new Date(prev);
      if (view === "day") c.setDate(c.getDate() + dir);
      else if (view === "week") c.setDate(c.getDate() + dir * 7);
      else c.setMonth(c.getMonth() + dir);
      return startOfDay(c);
    });
  };

  const goToday = () => {
    setCursor(startOfDay(new Date()));
  };

  /* ------------------------------ Loading ------------------------------ */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ------------------------------ Render ------------------------------ */

  return (
    <div className="space-y-8">
      {/* 1. METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={<Calendar size={20} className="text-black dark:text-white" />}
          label="Total Bookings"
          value={summary.total.toLocaleString()}
        />
        <MetricCard
          icon={<Wallet size={20} className="text-black dark:text-white" />}
          label="Paid"
          value={summary.paid.toLocaleString()}
        />
        <MetricCard
          icon={
            <CheckCircle2 size={20} className="text-black dark:text-white" />
          }
          label="Completed"
          value={summary.completed.toLocaleString()}
        />
        <MetricCard
          icon={<XCircle size={20} className="text-black dark:text-white" />}
          label="Cancelled"
          value={summary.cancelled.toLocaleString()}
        />
        <MetricCard
          icon={<TrendingUp size={20} className="text-black dark:text-white" />}
          label="Revenue"
          value={`${summary.revenue.toLocaleString()} KRW`}
          highlight
        />
      </div>

      {/* 2. ACTIVE LOCATIONS */}
      <div className={CARD}>
        <div className="flex items-center gap-2.5 mb-5">
          <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
            <MapPin size={16} />
          </span>
          <div>
            <h2 className="text-lg font-black text-foreground dark:text-white leading-tight">
              Active Locations
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">
              Areas covered by approved photographers
            </p>
          </div>
        </div>

        {locationStats.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            No active locations yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locationStats.map((loc) => (
              <div
                key={loc.location}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-full"
              >
                <span className="text-sm font-bold text-foreground dark:text-white">
                  {loc.location}
                </span>
                <span className="px-2 py-0.5 bg-accent/20 text-black dark:text-white rounded-full text-[11px] font-black">
                  {loc.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. SESSIONS CALENDAR */}
      <div className={CARD}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
              <CalendarRange size={16} />
            </span>
            <div>
              <h2 className="text-lg font-black text-foreground dark:text-white leading-tight">
                Sessions Calendar
              </h2>
              <p className="text-xs text-gray-400 dark:text-zinc-500">
                Confirmed & paid shoots with scheduled slots
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-1 self-start">
            {(["day", "week", "month"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black capitalize transition-all ${
                  view === v
                    ? "bg-accent text-black shadow-sm"
                    : "text-gray-500 dark:text-zinc-400 hover:text-foreground dark:hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Period navigation */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftPeriod(-1)}
              aria-label="Previous period"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 active:scale-95 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => shiftPeriod(1)}
              aria-label="Next period"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 active:scale-95 transition-all"
            >
              <ChevronRight size={18} />
            </button>
            <span className="ml-2 text-sm font-black text-foreground dark:text-white">
              {periodLabel}
            </span>
          </div>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-xl border border-gray-100 dark:border-zinc-800 text-xs font-black text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 active:scale-95 transition-all"
          >
            Today
          </button>
        </div>

        {/* Body */}
        {visibleSessions.length === 0 ? (
          <EmptyState />
        ) : view === "day" ? (
          <div className="space-y-3">
            {visibleSessions.map((s) => (
              <SessionItem key={s.id} session={s} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedDays.map(({ date, items }) => (
              <div key={date.toISOString()}>
                <div className="flex items-center gap-2 mb-3">
                  <h3
                    className={`text-sm font-black ${
                      sameDay(date, new Date())
                        ? "text-black dark:text-white"
                        : "text-gray-500 dark:text-zinc-400"
                    }`}
                  >
                    {fmtDayLabel(date)}
                  </h3>
                  {sameDay(date, new Date()) && (
                    <span className="px-2 py-0.5 bg-accent/20 text-black dark:text-white rounded-full text-[10px] font-black uppercase">
                      Today
                    </span>
                  )}
                  <span className="text-xs text-gray-300 dark:text-zinc-600 font-bold">
                    {items.length} session{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-gray-300 dark:text-zinc-600 pl-1">
                    No sessions
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map((s) => (
                      <SessionItem key={s.id} session={s} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Sub-components ----------------------------- */

function MetricCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`${CARD} flex items-center gap-3.5`}>
      <div
        className={`p-3 rounded-2xl shrink-0 ${
          highlight ? "bg-accent/25" : "bg-accent/10"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-lg font-black text-foreground dark:text-white mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function SessionItem({ session }: { session: Session }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-900/40">
      {/* Time block */}
      <div className="shrink-0 text-center min-w-[64px]">
        <p className="text-sm font-black text-foreground dark:text-white leading-tight">
          {session.start ? fmtTime(session.start) : "--:--"}
        </p>
        {session.end && (
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-bold mt-0.5">
            {fmtTime(session.end)}
          </p>
        )}
      </div>

      <div className="w-px self-stretch bg-gray-200 dark:bg-zinc-800" />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-foreground dark:text-white">
            {session.photographerName}
          </span>
          {session.publicCode && (
            <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500">
              #{session.publicCode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-zinc-400">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{session.shootLocation}</span>
        </div>
      </div>

      <div className="shrink-0">
        <StatusBadge status={session.status} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <Clock
        size={36}
        className="mx-auto text-gray-300 dark:text-zinc-700 mb-3"
      />
      <h3 className="text-base font-black text-foreground dark:text-white">
        No sessions scheduled
      </h3>
      <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">
        Nothing booked for this period. Try navigating to another date.
      </p>
    </div>
  );
}
