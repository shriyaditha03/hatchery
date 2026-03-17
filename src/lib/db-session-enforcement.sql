-- Migration to add session tracking for single session enforcement
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_session_key TEXT;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.profiles.current_session_key IS 'Stores a unique key for the active session to prevent concurrent logins.';
