"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import CustomDropdown from "@/components/CustomDropdown";
import photographersData from "@/data/photographers.json";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CreditCard, 
  User as UserIcon, 
  Mail, 
  Lock, 
  AlertCircle, 
  Sparkles, 
  MapPin, 
  Users, 
  Languages, 
  Timer, 
  ChevronRight, 
  ChevronLeft,
} from "lucide-react";

interface PhotographerProfile {
  id: string;
  name: string;
  avatar_url: string;
}

interface SlotDetails {
  id: string;
  start_time: string;
  end_time: string;
}

interface CheckoutClientProps {
  id: string;
}

const formatTimeRange = (start: Date, end: Date) => {
  const startStr = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const endStr = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${startStr} - ${endStr}`;
};

const formatSelectedSlotsTime = (slotsList: SlotDetails[]) => {
  if (slotsList.length === 0) return "";
  
  // Sort slots by start time
  const sorted = [...slotsList].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  
  // Find contiguous blocks
  const blocks: string[] = [];
  let blockStart = new Date(sorted[0].start_time);
  let blockEnd = new Date(sorted[0].end_time);
  
  for (let i = 1; i < sorted.length; i++) {
    const nextStart = new Date(sorted[i].start_time);
    const nextEnd = new Date(sorted[i].end_time);
    
    // Check if contiguous (allow up to 1 minute gap)
    if (Math.abs(nextStart.getTime() - blockEnd.getTime()) <= 60000) {
      blockEnd = nextEnd;
    } else {
      blocks.push(formatTimeRange(blockStart, blockEnd));
      blockStart = nextStart;
      blockEnd = nextEnd;
    }
  }
  
  blocks.push(formatTimeRange(blockStart, blockEnd));
  return blocks.join(", ");
};

const locationTypeOptions = [
  { value: "Outdoor", label: "Outdoor / City Settings" },
  { value: "Indoor", label: "Indoor (Cafe, Studio, Room)" },
  { value: "Mixed", label: "Mixed (Both Indoor & Outdoor)" },
  { value: "Studio Studio", label: "Professional Studio" },
];

const groupSizeOptions = [
  { value: "1 person", label: "1 person" },
  { value: "2 people (Couple)", label: "2 people (Couple)" },
  { value: "3-5 people (Family / Group)", label: "3-5 people (Family / Group)" },
  { value: "6+ people (Large Group)", label: "6+ people (Large Group)" },
];

const shootStyleOptions = [
  { value: "Casual / Street", label: "Casual / Street Snap" },
  { value: "Portrait", label: "Portrait / Headshot" },
  { value: "Couple / Date", label: "Couple / Wedding Date" },
  { value: "Travel / Hanok", label: "Travel / Traditional Hanok" },
  { value: "Concept / Artistic", label: "Concept / Artistic Theme" },
  { value: "Commercial / Fashion", label: "Commercial / Fashion Editorial" },
];

const preferredLanguageOptions = [
  { value: "English", label: "English" },
  { value: "Korean", label: "Korean" },
  { value: "Chinese", label: "Chinese" },
  { value: "Japanese", label: "Japanese" },
  { value: "Russian", label: "Russian" },
  { value: "Spanish", label: "Spanish" },
  { value: "Portuguese", label: "Portuguese" },
];

export default function CheckoutClient({ id }: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSlotId = searchParams.get("slot");

  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [photographer, setPhotographer] = useState<PhotographerProfile | null>(null);
  const [dbSlots, setDbSlots] = useState<SlotDetails[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<SlotDetails[]>([]);
  const [authView, setAuthView] = useState<"register" | "signin">("register");

  // Booking Wizard Steps:
  // 1: Choose Schedule (21 Days Calendly View)
  // 2: Shoot Details & Preferences
  // 3: Authentication / Account (skipped if user logged in)
  // 4: Summary & Payment
  const [step, setStep] = useState(1);

  // Step 1: Schedule selection states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<SlotDetails[]>([]);

  // Step 2: Shoot details states
  const [locationType, setLocationType] = useState("Outdoor");
  const [shootLocation, setShootLocation] = useState("");
  const [shootStyle, setShootStyle] = useState("Casual / Street");
  const [durationHours, setDurationHours] = useState("1 Hour");
  const [groupSize, setGroupSize] = useState("1 person");
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [customDetails, setCustomDetails] = useState("");

  // Step 3: Auth credentials form states
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Generate list of the next 21 days
  const next21Days = Array.from({ length: 21 }, (_, idx) => {
    const day = new Date();
    day.setDate(day.getDate() + idx);
    return day;
  });

  // Days (as toDateString keys) that actually have available slots.
  const daysWithSlots = new Set(
    dbSlots.map((s) => new Date(s.start_time).toDateString())
  );

  // Fetch Photographer Profile and Database Slots
  useEffect(() => {
    const loadCheckoutData = async () => {
      setLoading(true);
      try {
        if (!supabase) return;

        // 1. Resolve photographer — the slug may be a public_code (S01023) or a UUID.
        const isUuidParam = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const sel = `id, public_code, profiles:id ( full_name, avatar_url )`;
        let dbPhoto: any = null;
        const byCode = await supabase
          .from("photographer_profiles")
          .select(sel)
          .eq("public_code", id)
          .maybeSingle();
        dbPhoto = byCode.data;
        if (!dbPhoto && isUuidParam) {
          const byId = await supabase.from("photographer_profiles").select(sel).eq("id", id).maybeSingle();
          dbPhoto = byId.data;
        }

        const isMockId = id.startsWith("S01") || id.startsWith("S02");
        // The real photographer UUID — used for all downstream DB queries / FKs.
        let photographerUuid = id;
        if (dbPhoto) {
          const photoData = dbPhoto as any;
          photographerUuid = photoData.id;
          const profileInfo = Array.isArray(photoData.profiles) ? photoData.profiles[0] : photoData.profiles;
          const code = photoData.public_code || id;
          setPhotographer({
            id: photoData.id,
            name: profileInfo?.full_name || "Unknown Sphoter",
            avatar_url: profileInfo?.avatar_url || (isMockId
              ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${code}/${code}.webp`
              : "/media/default-profile.webp"),
          });
        } else {
          // Fallback to local JSON data in local/test mode
          const localPhoto = photographersData.find((p) => p.ID === id);
          setPhotographer({
            id: id,
            name: localPhoto?.Name || `Sphoter ${id}`,
            avatar_url: isMockId
              ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${id}/${id}.webp`
              : "/media/default-profile.webp",
          });
        }

        // 2. Fetch all future availability slots (by the resolved UUID)
        const { data: slotsData } = await supabase
          .from("availability_slots")
          .select("id, start_time, end_time")
          .eq("photographer_id", photographerUuid)
          .eq("status", "available")
          .gt("start_time", new Date().toISOString())
          .order("start_time", { ascending: true });

        const fetchedSlots = (slotsData || []) as SlotDetails[];
        setDbSlots(fetchedSlots);

        // Pre-select slot if query parameter exists
        if (initialSlotId) {
          const matchedSlot = fetchedSlots.find(s => s.id === initialSlotId);
          if (matchedSlot) {
            setSelectedSlots([matchedSlot]);
            const slotDate = new Date(matchedSlot.start_time);
            setSelectedDate(slotDate);
          }
        }
      } catch (err) {
        console.error("Error loading checkout details:", err);
        setError("Failed to load photographer details.");
      } finally {
        setLoading(false);
      }
    };

    loadCheckoutData();
  }, [id, initialSlotId]);

  // If selectedDate changes, filter/generate time slots for that day
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimeSlots([]);
      return;
    }

    const dateStr = selectedDate.toDateString();

    // Show only the photographer's real, available slots for the selected date.
    const matchedSlots = dbSlots.filter(
      (slot) => new Date(slot.start_time).toDateString() === dateStr
    );
    setAvailableTimeSlots(matchedSlots);
  }, [selectedDate, dbSlots]);

  // Automatically update shoot duration based on selected slots
  useEffect(() => {
    if (selectedSlots.length > 0) {
      const totalHours = selectedSlots.length;
      setDurationHours(`${totalHours} Hour${totalHours > 1 ? "s" : ""}`);
    } else {
      setDurationHours("");
    }
  }, [selectedSlots]);

  // Skip Auth step if the user logs in / is already authenticated
  useEffect(() => {
    if (user && step === 3) {
      setStep(4);
    }
  }, [user, step]);

  const handleToggleSlot = (slotItem: SlotDetails) => {
    setError(null);
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.id === slotItem.id);
      if (exists) {
        return prev.filter(s => s.id !== slotItem.id);
      } else {
        return [...prev, slotItem].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      }
    });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (selectedSlots.length === 0) {
        setError(t("coChooseSlotFirst"));
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      if (!shootLocation.trim()) {
        setError("Please enter a shoot location or venue name.");
        return;
      }
      if (!customDetails.trim()) {
        setError("Please add some shoot requirements or instructions.");
        return;
      }
      setError(null);
      if (user) {
        setStep(4); // Skip Auth directly to summary
      } else {
        setStep(3);
      }
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (step === 4 && !user) {
      setStep(3);
    } else if (step === 4 && user) {
      setStep(2);
    } else {
      setStep(prev => prev - 1);
    }
  };

  // Step 3 Authentication handlers
  const handleInlineSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionLoading(true);

    if (!privacyConsent) {
      setError("You must agree to the Privacy Policy to register.");
      setActionLoading(false);
      return;
    }

    if (!supabase) {
      setError("Database is not configured.");
      setActionLoading(false);
      return;
    }

    try {
      // Issue our own 6-digit code (15-min expiry) via /api/otp/send (Resend).
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signUpEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send verification code.");
      // Dev fallback: when no email provider is configured, the API returns the
      // code so the flow is testable. Surface it as a hint (never in production).
      if (data.devCode) {
        console.info(`[OTP dev] Your code: ${data.devCode}`);
        setError(`Dev mode: your code is ${data.devCode}`);
      }
      setShowVerification(true);
      setActionLoading(false);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionLoading(true);

    if (!supabase) {
      setError("Database is not configured.");
      setActionLoading(false);
      return;
    }

    try {
      // Verify the code + create the confirmed user server-side.
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signUpEmail.trim(),
          code: verificationCode.trim(),
          password: signUpPassword,
          full_name: signUpFullName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");

      // Sign the now-confirmed user in.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signUpEmail.trim(),
        password: signUpPassword,
      });
      if (signInError) throw signInError;

      setStep(4);
      setActionLoading(false);
    } catch (err: any) {
      setError(err.message || "Verification failed. Please check the code and try again.");
      setActionLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signUpEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resend failed.");
      if (data.devCode) setError(`Dev mode: your code is ${data.devCode}`);
      else setError(null);
      setActionLoading(false);
    } catch (err: any) {
      setError(err.message || "Resend failed.");
      setActionLoading(false);
    }
  };

  const handleInlineSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionLoading(true);

    if (!supabase) {
      setError("Database is not configured.");
      setActionLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || "Sign in failed.");
      setActionLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!supabase) return;
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.href,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || "Google Authentication failed.");
    }
  };

  // Step 4 Final Booking & Payment trigger
  const handleProceedToPayment = async () => {
    if (!user || !photographer || selectedSlots.length === 0) return;
    setError(null);
    setActionLoading(true);

    try {
      if (!supabase) return;

      const slotIds = selectedSlots.map((s) => s.id);

      // 1. Create pending booking record with structured shoot details.
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          client_id: user.id,
          photographer_id: photographer.id,
          slot_id: selectedSlots[0].id,
          status: "pending",
          fee_krw: 25000,
          shoot_location: shootLocation,
          location_type: locationType,
          shoot_style: shootStyle,
          group_size: groupSize,
          preferred_language: preferredLanguage,
          duration_label: durationHours,
          details: customDetails,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // The SPHOT system "pre-information" message is created server-side the moment
      // payment succeeds (in /api/mock-pay or the LS webhook), from the booking's
      // stored shoot details — so it appears centered as a SPHOT message, not the client's.

      // 2. Process payment — mock mode auto-succeeds (mirrors the LS webhook);
      //    live mode redirects to the Lemon Squeezy hosted checkout.
      const paymentsMode =
        process.env.NEXT_PUBLIC_PAYMENTS_MODE ||
        (process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRODUCT_ID ? "live" : "mock");

      if (paymentsMode === "live") {
        const storeId = process.env.NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID || "sphot";
        const productId = process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRODUCT_ID || "";
        const baseCheckoutUrl = `https://${storeId}.lemonsqueezy.com/checkout/buy/${productId}`;
        const emailParam = encodeURIComponent(user.email || "");
        const nameParam = encodeURIComponent(profile?.full_name || "");
        const slotIdsParam = slotIds.join(",");
        const checkoutUrl = `${baseCheckoutUrl}?checkout[custom][booking_id]=${booking.id}&checkout[custom][slot_ids]=${slotIdsParam}&checkout[email]=${emailParam}&checkout[name]=${nameParam}`;
        window.location.href = checkoutUrl;
        return;
      }

      // Mock mode: simulate a successful payment server-side, then go to chat.
      const res = await fetch("/api/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id, slot_ids: slotIds }),
      });
      if (!res.ok) {
        const { error: payErr } = await res.json().catch(() => ({ error: "Payment failed." }));
        throw new Error(payErr || "Payment failed.");
      }
      router.push(`/client/chat?booking=${booking.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to initialize booking payment.");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getDayName = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const getDayNumber = (date: Date) => {
    return date.getDate();
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
      
      {/* ─── STAGE PROGRESS BAR ─── */}
      {(() => {
        const stepsList = [
          { stepNum: 1, label: t("coStepSchedule") },
          { stepNum: 2, label: t("coStepDetails") },
          ...(!user ? [{ stepNum: 3, label: t("coStepAccount") }] : []),
          { stepNum: 4, label: t("coStepReserve") }
        ];
        const currentStepIndex = stepsList.findIndex(s => s.stepNum === step);
        const progressPercent = stepsList.length > 1 ? (currentStepIndex / (stepsList.length - 1)) * 100 : 0;

        return (
          <div className="w-full max-w-2xl mx-auto mb-12">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 dark:bg-zinc-800 -translate-y-1/2 -z-10" />
              
              {/* Progress fill */}
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-accent -translate-y-1/2 -z-10 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />

              {stepsList.map((barStep, idx) => {
                const isActive = step >= barStep.stepNum;
                const isCurrent = step === barStep.stepNum;
                return (
                  <div key={barStep.stepNum} className="flex flex-col items-center">
                    <div 
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all border ${
                        isCurrent
                          ? "bg-accent border-accent text-black font-black scale-110 shadow-sm"
                          : isActive
                          ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black font-bold"
                          : "bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className={`text-[11px] font-bold mt-2 tracking-wide ${isActive ? "text-foreground dark:text-white" : "text-gray-400 dark:text-zinc-500"}`}>
                      {barStep.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ─── LEFT COLUMN: CURRENT STEP VIEW ─── */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2 font-bold animate-fadeIn">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {/* STEP 1: CHOOSE SCHEDULE (CALENDLY-STYLE 21 DAYS) */}
          {step === 1 && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-foreground dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
                    <CalendarIcon size={20} />
                  </div>
                  {t("coChooseDateTime")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  {t("coChooseDateTimeSub")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[350px]">
                
                {/* Calendly-like Left Side: 21 Days list */}
                <div className="md:col-span-7 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">
                    {t("coSelectDate")}
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                    {next21Days.map((day, idx) => {
                      const isSelected = selectedDate?.toDateString() === day.toDateString();
                      const hasSlots = daysWithSlots.has(day.toDateString());
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!hasSlots}
                          aria-label={`${getDayName(day)} ${getMonthName(day)} ${getDayNumber(day)}${hasSlots ? "" : " (no availability)"}`}
                          onClick={() => {
                            setSelectedDate(day);
                            setSelectedSlots([]);
                            setError(null);
                          }}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "border-black bg-black text-accent font-black shadow-sm dark:border-zinc-800"
                              : hasSlots
                              ? "border-gray-100 dark:border-zinc-900 bg-gray-50/50 dark:bg-zinc-900/20 text-gray-700 dark:text-zinc-300 hover:border-gray-200 dark:hover:border-zinc-800"
                              : "border-transparent bg-transparent text-gray-300 dark:text-zinc-700 cursor-not-allowed opacity-40"
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                            {getDayName(day)}
                          </span>
                          <span className="text-lg font-black leading-none my-1">
                            {getDayNumber(day)}
                          </span>
                          <span className="text-[9px] uppercase font-bold">
                            {getMonthName(day)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calendly-like Right Side: Available hours list */}
                <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-gray-100 dark:border-zinc-800 pt-6 md:pt-0 md:pl-6 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">
                    {t("coAvailableSlots")}
                  </h3>

                  {!selectedDate ? (
                    <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-gray-100 dark:border-zinc-900 rounded-2xl">
                      <p className="text-xs text-gray-400 dark:text-zinc-500 text-center">
                        {t("coSelectDatePrompt")}
                      </p>
                    </div>
                  ) : availableTimeSlots.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center border border-transparent rounded-2xl">
                      <p className="text-xs text-gray-400 dark:text-zinc-500 text-center">
                        {t("coNoAvailabilityDay")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 hide-scrollbar">
                      {availableTimeSlots.map((slotItem) => {
                        const start = new Date(slotItem.start_time);
                        const isSelected = selectedSlots.some(s => s.id === slotItem.id);
                        
                        const startHourStr = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
                        
                        return (
                          <button
                            key={slotItem.id}
                            type="button"
                            onClick={() => handleToggleSlot(slotItem)}
                            className={`w-full flex items-center justify-center py-4 rounded-xl border text-lg font-black tracking-wide transition-all duration-200 ${
                              isSelected
                                ? "border-black bg-black text-accent shadow-md scale-[1.01] dark:border-zinc-800"
                                : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white hover:border-black dark:hover:border-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/40"
                            }`}
                          >
                            <span>{startHourStr}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* STEP 2: SHOOT PRE-INFORMATION DETAILS FORM */}
          {step === 2 && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-2xl font-black text-foreground dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
                    <Sparkles size={20} />
                  </div>
                  {t("coPreInfoTitle")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  {t("coPreInfoSub")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Location Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <MapPin size={13} /> {t("coLocationType")}
                  </label>
                  <CustomDropdown
                    options={locationTypeOptions}
                    value={locationType}
                    onChange={setLocationType}
                  />
                </div>

                {/* Specific shoot spot address */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">{t("coVenue")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("coVenuePlaceholder")}
                    value={shootLocation}
                    onChange={(e) => {
                      setShootLocation(e.target.value);
                      if (e.target.value.trim() && error?.includes("location")) {
                        setError(null);
                      }
                    }}
                    className={`w-full bg-gray-50 dark:bg-zinc-900 border rounded-xl py-3 px-4 text-sm outline-none text-foreground dark:text-white transition-all ${
                      error && !shootLocation.trim()
                        ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20"
                        : "border-gray-200 dark:border-zinc-800 focus:border-black dark:focus:border-white"
                    }`}
                  />
                  {error && !shootLocation.trim() && (
                    <span className="text-[10px] text-red-500 font-bold mt-1.5 block">
                      {t("coVenueRequired")}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Session Hours Duration (Pulled from selected slot) */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Timer size={13} /> {t("coAmountTime")}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={durationHours}
                    className="w-full bg-gray-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm text-gray-500 dark:text-zinc-400 cursor-not-allowed outline-none"
                  />
                </div>

                {/* Group size */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Users size={13} /> {t("coGroupSize")}
                  </label>
                  <CustomDropdown
                    options={groupSizeOptions}
                    value={groupSize}
                    onChange={setGroupSize}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Preferred Style/Theme */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles size={13} /> {t("coPreferredStyle")}
                  </label>
                  <CustomDropdown
                    options={shootStyleOptions}
                    value={shootStyle}
                    onChange={setShootStyle}
                  />
                </div>

                {/* Language Preference */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Languages size={13} /> {t("coCommLanguage")}
                  </label>
                  <CustomDropdown
                    options={preferredLanguageOptions}
                    value={preferredLanguage}
                    onChange={setPreferredLanguage}
                  />
                </div>
              </div>

              {/* Expected Shoot concept notes */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">{t("coShootDetails")}</label>
                <textarea
                  required
                  rows={4}
                  placeholder={t("coShootDetailsPlaceholder")}
                  value={customDetails}
                  onChange={(e) => {
                    setCustomDetails(e.target.value);
                    if (e.target.value.trim() && error?.includes("requirements")) {
                      setError(null);
                    }
                  }}
                  className={`w-full bg-gray-50 dark:bg-zinc-900 border rounded-xl p-4 text-sm outline-none text-foreground dark:text-white resize-none transition-all ${
                    error && !customDetails.trim()
                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20"
                      : "border-gray-200 dark:border-zinc-800 focus:border-black dark:focus:border-white"
                  }`}
                />
                {error && !customDetails.trim() && (
                  <span className="text-[10px] text-red-500 font-bold mt-1.5 block">
                    {t("coShootDetailsRequired")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: AUTHENTICATION BARRIER */}
          {step === 3 && !user && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="max-w-md mx-auto text-center space-y-2">
                <h2 className="text-2xl font-black text-foreground dark:text-white">
                  {t("coSecureReservation")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
                  {t("coSecureReservationSub")}
                </p>
              </div>

              <div className="max-w-md mx-auto bg-gray-50/50 dark:bg-zinc-900/30 border border-gray-100 dark:border-zinc-900 p-6 rounded-2xl space-y-6">
                {authView === "register" ? (
                  showVerification ? (
                    /* OTP VERIFICATION VIEW */
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-xl bg-black dark:bg-zinc-800 flex items-center justify-center text-accent mx-auto mb-3">
                          <Lock size={18} />
                        </div>
                        <h3 className="text-lg font-black text-foreground dark:text-white">
                          Verify Your Email
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1.5 leading-relaxed">
                          We sent a 6-digit confirmation code to <span className="font-bold text-foreground dark:text-white">{signUpEmail}</span>.
                        </p>
                      </div>

                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="123456"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                            className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-center text-lg font-black tracking-widest outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black font-black rounded-xl text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          {actionLoading ? (
                            <span className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                          ) : (
                            "Verify & Continue"
                          )}
                        </button>
                      </form>

                      <div className="flex flex-col gap-2 pt-2 items-center text-xs">
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={actionLoading}
                          className="text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white font-bold transition-colors"
                        >
                          Didn&apos;t get the code? Resend Code
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowVerification(false);
                            setError(null);
                          }}
                          className="text-gray-400 hover:underline mt-1"
                        >
                          Change Email Address
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* REGISTER VIEW */
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-lg font-black text-foreground dark:text-white flex items-center justify-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
                            <Sparkles size={16} />
                          </span>
                          Create Account / Register
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                          Register to save your booking schedule.
                        </p>
                      </div>

                      {/* Google OAuth (Sign Up) */}
                      <button
                        type="button"
                        onClick={handleGoogleAuth}
                        className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-zinc-800 text-sm font-bold bg-white dark:bg-zinc-900 text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-900/80 transition-colors flex items-center justify-center gap-2.5"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" className="w-4 h-4">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.75-.63-1.3-1.39-1.3-2.09z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Register with Google</span>
                      </button>

                      <div className="flex items-center gap-3 py-1 text-[10px] text-gray-400 dark:text-zinc-600 uppercase tracking-widest">
                        <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
                        <span>or register with email</span>
                        <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
                      </div>

                      <form onSubmit={handleInlineSignUp} className="space-y-3">
                        <div className="relative">
                          <UserIcon size={16} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={signUpFullName}
                            onChange={(e) => setSignUpFullName(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                          />
                        </div>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                          <input
                            type="email"
                            required
                            placeholder="Email Address"
                            value={signUpEmail}
                            onChange={(e) => setSignUpEmail(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                          />
                        </div>
                        <div className="relative">
                          <Lock size={16} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                          <input
                            type="password"
                            required
                            placeholder="Password"
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                          />
                        </div>

                        <label className="flex items-start gap-2.5 cursor-pointer mt-2">
                          <input
                            type="checkbox"
                            checked={privacyConsent}
                            onChange={(e) => setPrivacyConsent(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-zinc-600 accent-accent"
                            required
                          />
                          <span className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed text-left">
                            I agree to the{" "}
                            <a
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-bold text-foreground dark:text-white hover:text-accent transition-colors"
                            >
                              Privacy Policy
                            </a>{" "}
                            and consent to the processing of my personal data.
                          </span>
                        </label>

                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black font-black rounded-xl text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                          {actionLoading ? (
                            <span className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                          ) : (
                            "Create Account & Continue"
                          )}
                        </button>
                      </form>

                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setAuthView("signin")}
                          className="text-xs font-extrabold text-gray-700 dark:text-zinc-300 hover:underline inline-flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-900/40 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800/80 transition-all hover:scale-[1.02] hover:bg-gray-100 dark:hover:bg-zinc-800/60"
                        >
                          Already have an account? Sign-in
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  /* SIGN IN VIEW */
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-black text-foreground dark:text-white flex items-center justify-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
                          <UserIcon size={16} />
                        </span>
                        Sign In to Your Account
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                        Log into your existing SPHOT account to check out.
                      </p>
                    </div>

                    {/* Google OAuth (Sign In) */}
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-zinc-800 text-sm font-bold bg-white dark:bg-zinc-900 text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-900/80 transition-colors flex items-center justify-center gap-2.5"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" className="w-4 h-4">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.75-.63-1.3-1.39-1.3-2.09z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Sign In with Google</span>
                    </button>

                    <div className="flex items-center gap-3 py-1 text-[10px] text-gray-400 dark:text-zinc-600 uppercase tracking-widest">
                      <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
                      <span>or sign in with email</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
                    </div>

                    <form onSubmit={handleInlineSignIn} className="space-y-3">
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                        <input
                          type="email"
                          required
                          placeholder="Email Address"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Lock size={16} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                        <input
                          type="password"
                          required
                          placeholder="Password"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs outline-none text-foreground dark:text-white focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black font-black rounded-xl text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-2"
                      >
                        {actionLoading ? (
                          <span className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Sign In & Continue"
                        )}
                      </button>
                    </form>

                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setAuthView("register")}
                        className="text-xs font-extrabold text-gray-700 dark:text-zinc-300 hover:underline inline-flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-900/40 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800/80 transition-all hover:scale-[1.02] hover:bg-gray-100 dark:hover:bg-zinc-800/60"
                      >
                        Don&apos;t have an account? Register
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY & PAYMENT */}
          {step === 4 && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-2xl font-black text-foreground dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
                    <CreditCard size={20} />
                  </div>
                  {t("coConfirmTitle")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  {t("coConfirmSub")}
                </p>
              </div>

              {photographer && selectedSlots.length > 0 && (
                <div className="space-y-4">
                  {/* Summary grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-gray-100/50 dark:border-zinc-800/50">
                    <div className="flex gap-2">
                      <CalendarIcon size={16} className="text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black">Date</p>
                        <p className="text-sm font-bold text-foreground dark:text-white">
                          {new Date(selectedSlots[0].start_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Clock size={16} className="text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black">Time Slot</p>
                        <p className="text-sm font-bold text-foreground dark:text-white">
                          {formatSelectedSlotsTime(selectedSlots)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-200/50 dark:border-zinc-800/50">
                      <MapPin size={16} className="text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black">Shoot Spot &amp; Type</p>
                        <p className="text-sm font-bold text-foreground dark:text-white">
                          {shootLocation} ({locationType})
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-200/50 dark:border-zinc-800/50">
                      <Sparkles size={16} className="text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black">Preferred Style &amp; Theme</p>
                        <p className="text-sm font-bold text-foreground dark:text-white">
                          {shootStyle}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-200/50 dark:border-zinc-800/50">
                      <Users size={16} className="text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black">Duration &amp; Group</p>
                        <p className="text-sm font-bold text-foreground dark:text-white">
                          {durationHours} / {groupSize}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-200/50 dark:border-zinc-800/50">
                      <Languages size={16} className="text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black">Communication Language</p>
                        <p className="text-sm font-bold text-foreground dark:text-white">
                          {preferredLanguage}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-1 sm:col-span-2 flex gap-2 pt-2 border-t border-gray-200/50 dark:border-zinc-800/50">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black">Shoot concept &amp; requests</p>
                        <p className="text-xs text-foreground dark:text-white mt-1 whitespace-pre-wrap italic">
                          &ldquo;{customDetails}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Notice Yellow Accent Warning Callout */}
                  <div className="bg-amber-500/10 border-l-4 border-accent p-4 rounded-xl space-y-2 text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-extrabold uppercase tracking-wide flex items-center gap-1.5 text-black dark:text-white">
                      <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      {t("coFeeOnly")}
                    </p>
                    <p className="leading-relaxed font-medium">
                      {t("coFeeLine1Pre")}
                      <span className="font-extrabold text-black dark:text-white">{t("coFeeLine1Bold")}</span>
                      {t("coFeeLine1Post")}
                    </p>
                    <p className="leading-relaxed font-medium">
                      {t("coFeeLine2Pre")}
                      <span className="font-extrabold text-black dark:text-white">{t("coFeeLine2Bold")}</span>
                      {t("coFeeLine2Post")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── NAVIGATION BUTTONS ─── */}
          <div className="flex justify-between items-center pt-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors text-sm font-bold text-gray-500 dark:text-zinc-400 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                {t("coBack")}
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1 bg-black dark:bg-white text-white dark:text-black font-black px-6 py-3.5 rounded-xl text-sm hover:opacity-90 transition-all shadow-sm"
              >
                <span>{t("coContinue")}</span>
                <ChevronRight size={16} />
              </button>
            ) : null}
          </div>

        </div>

        {/* ─── RIGHT COLUMN: SUMMARY & CHECKOUT CTA ─── */}
        <div className="lg:col-span-4 md:sticky md:top-24 space-y-6">
          
          {/* Photographer Sidebar Summary */}
          {photographer && (
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-black dark:bg-zinc-800 mx-auto mb-3 border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-accent font-black text-xl">
                {(!photographer.avatar_url || avatarError || photographer.avatar_url.includes("default-profile.webp")) ? (
                  <span>{photographer.name.slice(0, 2).toUpperCase()}</span>
                ) : (
                  <img 
                    src={photographer.avatar_url} 
                    alt={photographer.name} 
                    className="w-full h-full object-cover" 
                    onError={() => setAvatarError(true)}
                  />
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">{t("coBookingFor")}</p>
              <h3 className="text-lg font-black text-foreground dark:text-white mt-0.5">{photographer.name}</h3>
            </div>
          )}

          {/* Pricing Box & Final Payment (Active in Step 4) */}
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-foreground dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-3">
              {t("coPaymentSummary")}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>{t("coReservationFee")}</span>
                <span className="font-bold text-foreground dark:text-white">25,000 KRW</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{t("coShootPrice")}</span>
                <span className="font-bold text-foreground dark:text-white italic">{t("coDirectSettlement")}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 flex justify-between items-center text-sm font-black">
              <span className="text-gray-600 dark:text-zinc-400">{t("coTotalNow")}</span>
              <span className="text-lg text-black dark:text-white font-black">25,000 KRW</span>
            </div>

            {step === 4 ? (
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={actionLoading}
                className="w-full py-4 rounded-xl bg-accent text-black font-extrabold text-base shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>{t("coPayFee")}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={step === 1 && selectedSlots.length === 0}
                className="w-full py-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                <span>{t("coContinueBooking")}</span>
                <ChevronRight size={14} />
              </button>
            )}

            <p className="text-center text-[10px] text-gray-400 dark:text-zinc-500">
              {t("coRefundNote")}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
