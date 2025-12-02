-- Add toggle for AI Commentary visibility
ALTER TABLE public.signal_pages
ADD COLUMN show_ai_commentary BOOLEAN DEFAULT true;

-- Update existing pages to show AI commentary by default
UPDATE public.signal_pages SET show_ai_commentary = true WHERE show_ai_commentary IS NULL;
