-- Support SPHOT "system" messages (e.g. booking pre-info) shown centered in chat.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'user'
  CHECK (kind IN ('user', 'system'));

-- System messages have no human sender.
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;

-- Allow booking participants to read system messages too (existing select policy
-- already covers all messages on their booking; no change needed for SELECT).
-- Inserts of system messages are done via the service role (API), which bypasses RLS.
