-- Fix duplicate signal_pages entries
-- Keep only the most recent signal_page per job, delete the rest

-- First, delete duplicates keeping the one with the latest generated_at
DELETE FROM public.signal_pages
WHERE id NOT IN (
  SELECT DISTINCT ON (job_id) id
  FROM public.signal_pages
  ORDER BY job_id, generated_at DESC
);

-- Add unique constraint on job_id to prevent future duplicates
-- Each job should have exactly one signal_page
ALTER TABLE public.signal_pages
ADD CONSTRAINT signal_pages_job_id_unique UNIQUE (job_id);
