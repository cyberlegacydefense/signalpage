-- Add generation_status to signal_pages for optimistic generation flow
-- This allows the page to be created immediately and updated when LLM generation completes

-- Create the enum type
CREATE TYPE generation_status AS ENUM ('generating', 'ready', 'failed');

-- Add the column with default 'ready' (existing pages are already generated)
ALTER TABLE public.signal_pages
ADD COLUMN IF NOT EXISTS generation_status generation_status DEFAULT 'ready';

-- Add error message column for failed generations
ALTER TABLE public.signal_pages
ADD COLUMN IF NOT EXISTS generation_error TEXT DEFAULT NULL;

-- Enable realtime for signal_pages (needed for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_pages;

-- Index for quick lookups of generating pages
CREATE INDEX IF NOT EXISTS idx_signal_pages_generation_status
ON public.signal_pages (generation_status)
WHERE generation_status = 'generating';
