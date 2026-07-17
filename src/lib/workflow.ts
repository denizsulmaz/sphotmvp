// Photographer-facing booking workflow steps. Mirrors the server-side state
// machine in /api/booking/update-status — the API is the enforcement point,
// this map only drives the UI.
export const WORKFLOW_STEPS: Record<string, { next: string; actionLabel: string }> = {
  booking: { next: "shooted", actionLabel: "Mark as Shot" },
  shooted: { next: "edited", actionLabel: "Mark as Edited" },
  edited: { next: "sent", actionLabel: "Mark as Sent" },
  sent: { next: "completed", actionLabel: "Mark as Completed" },
  // Legacy paid-flow statuses
  paid: { next: "confirmed", actionLabel: "Confirm Booking" },
  confirmed: { next: "completed", actionLabel: "Mark as Completed" },
};

// Human wording for the status a booking just moved to (toast copy).
export const STATUS_PAST_LABEL: Record<string, string> = {
  shooted: "shot",
  edited: "edited",
  sent: "sent",
  completed: "completed",
  confirmed: "confirmed",
};

// Statuses a photographer can still request cancellation from.
export const CANCELLABLE_STATUSES = ["booking", "shooted", "edited", "paid", "confirmed"];
