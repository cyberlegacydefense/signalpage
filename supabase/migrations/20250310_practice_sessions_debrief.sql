-- Add debrief column to store debrief results
ALTER TABLE public.practice_sessions
ADD COLUMN IF NOT EXISTS debrief JSONB;
