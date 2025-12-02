-- Add name column to resumes table
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS name TEXT;
