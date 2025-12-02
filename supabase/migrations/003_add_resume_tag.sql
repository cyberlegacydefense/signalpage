-- Add tag column to resumes table for categorization
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS tag TEXT;

-- Add a comment to document the intended use
COMMENT ON COLUMN public.resumes.tag IS 'Category tag for the resume (e.g., Technical, AI, Sales, Management)';
