-- Add match score to signal pages
ALTER TABLE public.signal_pages
ADD COLUMN match_score INTEGER;

-- Add match score breakdown for detailed analysis
ALTER TABLE public.signal_pages
ADD COLUMN match_breakdown JSONB;
