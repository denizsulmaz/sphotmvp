"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Calendar, Clock, CreditCard, User, Mail, Lock, AlertCircle, Sparkles } from "lucide-react";

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

export default function CheckoutClient({ id }: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slotId = searchParams.get("slot");

  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [photographer, setPhotographer] = useState<PhotographerProfile | null>(null);
  const [slot, setSlot] = useState<SlotDetails | null>(null);
  
  // Checkout & Auth form state
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slotId) {
      router.push(`/p/${id}`);
      return;
    }

    const loadCheckoutData = async () => {
      setLoading(true);
      try {
        if (!supabase) return;

        // 1. Fetch photographer
        const { data: dbPhoto } = await supabase
          .from("photographer_profiles")
          .select(`
            id,
            profiles:id (
              full_name,
              avatar_url
            )
          `)
          .eq("id", id)
          .single();

        if (dbPhoto) {
          setPhotographer({
            id: dbPhoto.id,
            name: dbPhoto.profiles?.full_name || "Unknown Photographer",
            avatar_url: dbPhoto.profiles?.avatar_url || "/media/default-profile.webp",
          });
        }

        // 2. Fetch slot
        const { data: dbSlot } = await supabase
          .from("availability_slots")
          .select("*")
          .eq("id", slotId)
          .eq("status", "available")
          .single();

        if (dbSlot) {
          setSlot(dbSlot as SlotDetails);
        } else {
          setError("This availability slot is no longer available.");
        }
      } catch (err) {
        console.error("Error loading checkout details:", err);
        setError("Failed to load checkout details.");
      } finally {
        setLoading(false);
      }
    };

    loadCheckoutData();
  }, [id, slotId]);

  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionLoading(true);

    if (!supabase) {
      setError("Database is not configured.");
      setActionLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: "client",
            },
          },
        });

        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setActionLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!user || !slot || !photographer) return;
    setError(null);
    setActionLoading(true);

    try {
      if (!supabase) return;

      // 1. Create a pending booking record
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          client_id: user.id,
          photographer_id: photographer.id,
          slot_id: slot.id,
          status: "pending",
          fee_krw: 25000,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Build Lemon Squeezy custom checkout URL
      const storeId = process.env.NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID || "sphot";
      const productId = process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRODUCT_ID || "";
      const baseCheckoutUrl = `https://${storeId}.lemonsqueezy.com/checkout/buy/${productId}`;
      
      const emailParam = encodeURIComponent(user.email || "");
      const nameParam = encodeURIComponent(profile?.full_name || "");
      const checkoutUrl = `${baseCheckoutUrl}?checkout[custom][booking_id]=${booking.id}&checkout[email]=${emailParam}&checkout[name]=${nameParam}`;

      // 3. Redirect user to Lemon Squeezy
      router.push(checkoutUrl);
    } catch (err: any) {
      setError(err.message || "Failed to initialize reservation payment.");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Format Helper
  const formatSlotDateTime = (isoStart: string, isoEnd: string) => {
    const start = new Date(isoStart);
    const end = new Date(isoEnd);
    const dateStr = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const timeStr = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return { dateStr, timeStr };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-4">
        
        {/* Left Side: Booking details + Inline Auth */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-foreground dark:text-white">
              <Sparkles className="text-accent" size={20} />
              Booking Details
            </h2>

            {photographer && slot && (
              <div className="space-y-4">
                {/* Photographer Card */}
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-900/40 p-4 rounded-2xl">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
                    <img src={photographer.avatar_url} alt={photographer.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Photographer</p>
                    <p className="text-base font-black text-foreground dark:text-white">{photographer.name}</p>
                  </div>
                </div>

                {/* Selected Slot info */}
                <div className="space-y-3 bg-gray-50 dark:bg-zinc-900/40 p-4 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <Calendar className="text-gray-400 dark:text-zinc-500 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-zinc-500">Date</p>
                      <p className="text-sm font-bold text-foreground dark:text-white">
                        {formatSlotDateTime(slot.start_time, slot.end_time).dateStr}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-t border-gray-200/50 dark:border-zinc-800/50 pt-3">
                    <Clock className="text-gray-400 dark:text-zinc-500 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-zinc-500">Time Window</p>
                      <p className="text-sm font-bold text-foreground dark:text-white">
                        {formatSlotDateTime(slot.start_time, slot.end_time).timeStr}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Authentication Barrier */}
          {!user ? (
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <div className="flex border-b border-gray-100 dark:border-zinc-800 mb-6">
                <button
                  onClick={() => setIsSignUp(true)}
                  className={`flex-1 pb-3 text-sm font-black transition-colors ${
                    isSignUp
                      ? "text-black dark:text-white border-b-2 border-accent"
                      : "text-gray-400 dark:text-zinc-500"
                  }`}
                >
                  Create Account
                </button>
                <button
                  onClick={() => setIsSignUp(false)}
                  className={`flex-1 pb-3 text-sm font-black transition-colors ${
                    !isSignUp
                      ? "text-black dark:text-white border-b-2 border-accent"
                      : "text-gray-400 dark:text-zinc-500"
                  }`}
                >
                  I have an Account
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm mb-4">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleInlineAuth} className="space-y-4">
                {isSignUp && (
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm outline-none text-foreground dark:text-white"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm outline-none text-foreground dark:text-white"
                  />
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm outline-none text-foreground dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-black rounded-xl text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <span className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                  ) : isSignUp ? (
                    "Register & Continue"
                  ) : (
                    "Sign In & Continue"
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-black mb-3 text-foreground dark:text-white">Shoot Requirements</h3>
              <textarea
                placeholder="Describe your ideas, location specifics, or general requests for this photo session (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-black dark:focus:border-white transition-all text-foreground dark:text-white resize-none"
              />
            </div>
          )}
        </div>

        {/* Right Side: Order Summary & Checkout CTA */}
        <div className="md:col-span-5">
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm md:sticky md:top-24">
            <h2 className="text-xl font-black mb-6 text-foreground dark:text-white">Reservation Summary</h2>
            
            <div className="space-y-3 text-sm border-b border-gray-100 dark:border-zinc-800 pb-4">
              <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                <span>Platform Reservation Fee</span>
                <span className="font-bold text-foreground dark:text-white">25,000 KRW</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                <span>Direct Photographer Price</span>
                <span className="font-bold text-foreground dark:text-white">Varies (Offline Settlement)</span>
              </div>
            </div>

            <div className="py-4 flex justify-between items-center text-base font-black">
              <span className="text-foreground dark:text-white">Amount to Pay Now</span>
              <span className="text-xl text-black dark:text-white font-black">25,000 KRW</span>
            </div>

            {error && !user && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleProceedToPayment}
              disabled={!user || actionLoading || !slot}
              className="w-full py-4 rounded-xl bg-accent text-black font-black text-lg shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <span className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard size={18} />
                  <span>Reserve Slot via Lemon Squeezy</span>
                </>
              )}
            </button>

            {!user && (
              <p className="text-center text-xs text-gray-400 dark:text-zinc-500 mt-3">
                Please register or sign in to proceed with the payment.
              </p>
            )}

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-400 dark:text-zinc-500 space-y-2">
              <p className="font-bold text-gray-500 dark:text-zinc-400">Refund Policy:</p>
              <p>The platform reservation fee is fully refundable upon booking cancellation up to 48 hours before the scheduled time window.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
