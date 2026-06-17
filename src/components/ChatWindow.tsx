"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, Clock, User, ShieldAlert } from "lucide-react";

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChatWindowProps {
  bookingId: string;
  currentUserId: string;
  otherPartyName: string;
  otherPartyAvatar: string;
}

export default function ChatWindow({
  bookingId,
  currentUserId,
  otherPartyName,
  otherPartyAvatar,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages((data || []) as Message[]);
      } catch (err) {
        console.error("Error loading chat messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [bookingId]);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(`booking-chat:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Avoid duplicate appends (if insert resolves immediately locally)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      alert("Failed to send message. Please try again.");
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
          <h4 className="text-sm font-black text-foreground dark:text-white">{otherPartyName}</h4>
          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Active Booking Chat
          </span>
        </div>
      </div>

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
          messages.map((message) => {
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
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input container */}
      <form onSubmit={handleSendMessage} className="p-3 bg-gray-50 dark:bg-zinc-900/40 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message..."
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
