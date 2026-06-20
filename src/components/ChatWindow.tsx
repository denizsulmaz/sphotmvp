"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, Clock, ShieldAlert, Flag } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/context/LanguageContext";

interface Message {
  id: string;
  booking_id: string;
  sender_id: string | null;
  kind?: "user" | "system";
  content: string;
  created_at: string;
}

interface ChatWindowProps {
  bookingId: string;
  currentUserId: string;
  otherPartyName: string;
  otherPartyAvatar: string;
  otherPartyCode?: string;
}

export default function ChatWindow({
  bookingId,
  currentUserId,
  otherPartyName,
  otherPartyAvatar,
  otherPartyCode,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDone = useRef(false);
  const { showToast } = useToast();
  const { t } = useLanguage();

  const submitReport = async () => {
    if (!supabase) return;
    setReporting(true);
    const { error } = await supabase.from("reports").insert({
      booking_id: bookingId,
      reporter_id: currentUserId,
      reason: reportReason.trim() || "No reason provided",
    });
    setReporting(false);
    if (error) {
      showToast("Could not submit report.", "error");
    } else {
      showToast("Report submitted. Our team will review it.", "success");
      setShowReport(false);
      setReportReason("");
    }
  };

  const PAGE_SIZE = 30;

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);

        if (error) throw error;
        const fetched = (data || []) as Message[];
        // Reverse because we queried descending
        const reversed = [...fetched].reverse();
        setMessages(reversed);
        setHasMore(fetched.length === PAGE_SIZE);

        // Scroll to bottom after layout paint
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          initialScrollDone.current = true;
        }, 100);
      } catch (err) {
        console.error("Error loading chat messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [bookingId]);

  // Load older messages on demand
  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMore || messages.length === 0 || !supabase) return;
    setLoadingOlder(true);
    try {
      const oldestMessage = messages[0];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("booking_id", bookingId)
        .lt("created_at", oldestMessage.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      const fetched = (data || []) as Message[];
      if (fetched.length > 0) {
        const reversed = [...fetched].reverse();
        setMessages((prev) => [...reversed, ...prev]);
      }
      setHasMore(fetched.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error loading older messages:", err);
      showToast("Failed to load older messages.", "error");
    } finally {
      setLoadingOlder(false);
    }
  };

  // Subscribe to real-time chat messages
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel(`booking-chat:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload: any) => {
          const newMessage = payload.new as Message;
          // Avoid duplicate appends (if insert resolves immediately locally)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          // Scroll to bottom smoothly for new messages
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [bookingId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending || !supabase) return;

    const textToSend = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const { error } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: currentUserId,
        content: textToSend,
      });

      if (error) throw error;
    } catch (err) {
      console.error("Failed to send message:", err);
      showToast("Failed to send message. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-[500px] bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
      
      {/* Header bar */}
      <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-900/40 p-4 border-b border-gray-100 dark:border-zinc-800 shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
          <img src={otherPartyAvatar} alt={otherPartyName} className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-foreground dark:text-white">{otherPartyName}</h4>
            {otherPartyCode && (
              <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded text-[10px] font-mono font-bold tracking-wider">
                #{otherPartyCode}
              </span>
            )}
          </div>
          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            {t("chatActiveBooking")}
          </span>
        </div>
        <button
          onClick={() => setShowReport(true)}
          aria-label="Report this conversation"
          title="Report conversation"
          className="ml-auto p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <Flag size={16} />
        </button>
      </div>

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowReport(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-base font-black text-foreground dark:text-white flex items-center gap-2"><Flag size={16} className="text-red-500" /> Report conversation</h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Tell us what&apos;s wrong. Our team will review this chat.</p>
            <textarea
              rows={3} value={reportReason} onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue (e.g. inappropriate behavior, spam, off-platform payment request)…"
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 text-xs outline-none text-foreground dark:text-white resize-none focus:border-black dark:focus:border-white"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReport(false)} className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-zinc-400 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800">Cancel</button>
              <button onClick={submitReport} disabled={reporting} className="px-4 py-2 bg-red-500 text-white text-xs font-black rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                {reporting ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400 dark:text-zinc-500 space-y-2">
            <ShieldAlert size={36} className="text-gray-300 dark:text-zinc-700" />
            <h5 className="text-sm font-black text-foreground dark:text-white">Secure Chat Unlocked</h5>
            <p className="text-xs">Send a greeting message to coordinate dates, shoot plans, or outfits!</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 text-[10px] font-extrabold rounded-full text-gray-600 dark:text-zinc-400 transition-colors disabled:opacity-50"
                >
                  {loadingOlder ? `${t("chatLoadOlder")}…` : t("chatLoadOlder")}
                </button>
              </div>
            )}
            {messages.map((message) => {
              // SPHOT system message (e.g. booking pre-info) — centered, not a chat bubble.
              if (message.kind === "system") {
                return (
                  <div key={message.id} className="flex flex-col items-center my-2">
                    <div className="max-w-[85%] w-full bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3 text-xs text-foreground dark:text-zinc-100">
                      <div className="flex items-center justify-center gap-1.5 mb-1.5 font-black uppercase tracking-wider text-[10px] text-gray-500 dark:text-zinc-400">
                        <span className="w-4 h-4 rounded bg-black dark:bg-white text-accent dark:text-black flex items-center justify-center text-[8px] font-black">S</span>
                        SPHOT
                      </div>
                      <p className="whitespace-pre-wrap break-words text-center leading-relaxed">{message.content}</p>
                    </div>
                    <span className="text-[9px] text-gray-400 dark:text-zinc-600 mt-1 flex items-center gap-0.5">
                      <Clock size={10} />
                      {formatMessageTime(message.created_at)}
                    </span>
                  </div>
                );
              }
              const isMe = message.sender_id === currentUserId;
              return (
                <div key={message.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                      isMe
                        ? "bg-black text-white dark:bg-white dark:text-black rounded-tr-none font-medium"
                        : "bg-gray-100 text-foreground dark:bg-zinc-900 dark:text-zinc-100 rounded-tl-none font-medium"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                  <span className="text-[9px] text-gray-400 dark:text-zinc-600 mt-1 flex items-center gap-0.5">
                    <Clock size={10} />
                    {formatMessageTime(message.created_at)}
                  </span>
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input container */}
      <form onSubmit={handleSendMessage} className="p-3 bg-gray-50 dark:bg-zinc-900/40 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("chatTypeMessage")}
          className="flex-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-black dark:focus:border-white transition-all text-foreground dark:text-white"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="p-3 bg-accent text-foreground rounded-xl font-bold shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
