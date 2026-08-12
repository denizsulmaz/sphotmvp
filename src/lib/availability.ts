// Recurring-availability expansion. Availability is stored as RULES
// (availability_rules) + EXCEPTIONS (availability_exceptions); concrete hours
// only exist as availability_slots rows once booked (or as legacy 'available'
// rows, which are unioned in). This module turns those into concrete bookable
// hours for a date range, entirely in memory — used by the checkout page, the
// schedule page, and the booking API (server-side validation). Photographers
// with no schedule of their own fall back to a default (see DEFAULT_* below).

export interface AvailabilityRule {
  id: string;
  photographer_id: string;
  days_of_week: number[]; // 0=Sunday … 6=Saturday
  start_minute: number; // minutes from local midnight (studio tz)
  end_minute: number; // exclusive
  valid_from: string; // YYYY-MM-DD (local)
  valid_until: string; // YYYY-MM-DD (local, inclusive)
}

export interface AvailabilityException {
  id?: string;
  date: string; // YYYY-MM-DD (local)
  start_minute: number | null; // null = whole day off
  end_minute: number | null;
}

export interface SlotRow {
  id: string;
  start_time: string; // UTC ISO
  end_time: string; // UTC ISO
  status: "available" | "booked";
}

export interface ExpandedSlot {
  start_time: string; // UTC ISO
  end_time: string; // UTC ISO
  dayKey: string; // local YYYY-MM-DD in the studio tz
  startMinute: number; // local minutes from midnight
  // 'rule'  → generated from a recurrence rule (delete = add an exception)
  // 'slot'  → legacy 'available' availability_slots row (delete = delete row)
  source: "rule" | "slot";
  slotId?: string;
}

const MS_PER_MIN = 60_000;

// Photographers who never filled in their schedule are bookable by default
// every day between these hours (studio timezone — Asia/Seoul unless the
// profile overrides it). Any self-set schedule replaces the default entirely.
export const DEFAULT_START_MINUTE = 9 * 60; // 09:00
export const DEFAULT_END_MINUTE = 20 * 60; // 20:00

// ── timezone helpers ─────────────────────────────────────────

function tzOffsetMinutes(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour === 24 ? 0 : parts.hour,
    parts.minute,
    parts.second
  );
  return (asUtc - utcMs) / MS_PER_MIN;
}

/** Convert a local (studio-tz) date + minute-of-day to a UTC Date. DST-safe. */
export function localToUtc(dateStr: string, minute: number, tz: string): Date {
  const guess = Date.parse(`${dateStr}T00:00:00Z`) + minute * MS_PER_MIN;
  let ts = guess - tzOffsetMinutes(guess, tz) * MS_PER_MIN;
  ts = guess - tzOffsetMinutes(ts, tz) * MS_PER_MIN; // second pass for DST edges
  return new Date(ts);
}

/** Local YYYY-MM-DD of a UTC instant in the given timezone. */
export function utcToLocalDay(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.split("T")[0];
  }
}

/** Local minutes-from-midnight of a UTC instant in the given timezone. */
export function utcToLocalMinute(iso: string, tz: string): number {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  let h = 0,
    m = 0;
  for (const p of parts) {
    if (p.type === "hour") h = Number(p.value) === 24 ? 0 : Number(p.value);
    if (p.type === "minute") m = Number(p.value);
  }
  return h * 60 + m;
}

/** Weekday (0=Sun … 6=Sat) of a local calendar date — tz-independent. */
export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** Add N days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/** Today's local date in a timezone. */
export function todayIn(tz: string): string {
  return utcToLocalDay(new Date().toISOString(), tz);
}

// ── expansion ────────────────────────────────────────────────

export function expandAvailability(opts: {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  /** All availability_slots rows in range — 'booked' rows block hours,
   *  legacy 'available' rows are unioned in as bookable. */
  slots: SlotRow[];
  timezone: string;
  fromDate: string; // local YYYY-MM-DD, inclusive
  toDate: string; // local YYYY-MM-DD, inclusive
  slotMinutes?: number; // default 60
  /** Exclude hours starting before this instant (default: now). */
  notBefore?: Date | null;
}): ExpandedSlot[] {
  const {
    rules,
    exceptions,
    slots,
    timezone,
    fromDate,
    toDate,
    slotMinutes = 60,
    notBefore = new Date(),
  } = opts;

  // Index exceptions by local date.
  const wholeDayOff = new Set<string>();
  const rangesOff = new Map<string, Array<[number, number]>>();
  for (const ex of exceptions) {
    if (ex.start_minute == null) {
      wholeDayOff.add(ex.date);
    } else {
      const list = rangesOff.get(ex.date) || [];
      list.push([ex.start_minute, ex.end_minute as number]);
      rangesOff.set(ex.date, list);
    }
  }

  // Index booked hours by UTC start; collect legacy available rows.
  const bookedStarts = new Set<string>();
  const legacyAvailable: SlotRow[] = [];
  for (const s of slots) {
    if (s.status === "booked") bookedStarts.add(new Date(s.start_time).toISOString());
    else legacyAvailable.push(s);
  }

  const out = new Map<string, ExpandedSlot>(); // keyed by UTC start ISO
  const minTs = notBefore ? notBefore.getTime() : -Infinity;

  const blocked = (dayKey: string, startMin: number, endMin: number) => {
    if (wholeDayOff.has(dayKey)) return true;
    for (const [a, b] of rangesOff.get(dayKey) || []) {
      if (startMin < b && endMin > a) return true;
    }
    return false;
  };

  // 1. Union legacy 'available' slot rows FIRST — they must win over
  // rule-generated hours so the hour keeps its slotId. A released
  // (cancelled) booking leaves an 'available' row behind; if the rule
  // version won, booking would try to INSERT a duplicate row and hit the
  // unique index — making the hour permanently unbookable.
  for (const s of legacyAvailable) {
    const start = new Date(s.start_time);
    if (start.getTime() < minTs) continue;
    const startIso = start.toISOString();
    if (bookedStarts.has(startIso)) continue;
    const dayKey = utcToLocalDay(startIso, timezone);
    if (dayKey < fromDate || dayKey > toDate) continue;
    const startMin = utcToLocalMinute(startIso, timezone);
    const endMin = startMin + Math.round((new Date(s.end_time).getTime() - start.getTime()) / MS_PER_MIN);
    if (blocked(dayKey, startMin, endMin)) continue;
    out.set(startIso, {
      start_time: startIso,
      end_time: new Date(s.end_time).toISOString(),
      dayKey,
      startMinute: startMin,
      source: "slot",
      slotId: s.id,
    });
  }

  // Default schedule: a photographer with no rule covering any day in range
  // and no legacy 'available' rows never filled in their schedule — treat
  // them as available 09:00–20:00 (studio tz) every day. Exceptions (days
  // marked off) still apply to the default.
  const hasOwnSchedule =
    rules.some((r) => r.valid_until >= fromDate && r.valid_from <= toDate) ||
    legacyAvailable.length > 0;
  const effectiveRules: AvailabilityRule[] = hasOwnSchedule
    ? rules
    : [
        {
          id: "default",
          photographer_id: "",
          days_of_week: [0, 1, 2, 3, 4, 5, 6],
          start_minute: DEFAULT_START_MINUTE,
          end_minute: DEFAULT_END_MINUTE,
          valid_from: fromDate,
          valid_until: toDate,
        },
      ];

  // 2. Expand rules day by day (skipping hours a legacy row already covers).
  for (let day = fromDate; day <= toDate; day = addDays(day, 1)) {
    const dow = weekdayOf(day);
    for (const rule of effectiveRules) {
      if (day < rule.valid_from || day > rule.valid_until) continue;
      if (!rule.days_of_week.includes(dow)) continue;
      for (let m = rule.start_minute; m + slotMinutes <= rule.end_minute; m += slotMinutes) {
        if (blocked(day, m, m + slotMinutes)) continue;
        const start = localToUtc(day, m, timezone);
        if (start.getTime() < minTs) continue;
        const startIso = start.toISOString();
        if (bookedStarts.has(startIso) || out.has(startIso)) continue;
        out.set(startIso, {
          start_time: startIso,
          end_time: new Date(start.getTime() + slotMinutes * MS_PER_MIN).toISOString(),
          dayKey: day,
          startMinute: m,
          source: "rule",
        });
      }
    }
  }

  return Array.from(out.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/** Format a minute-of-day as "HH:MM". */
export function minuteToHHMM(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
