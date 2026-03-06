-- Migration to support multiple interviewers per job
-- Adds interviewer_name column and updates unique constraint

-- Add interviewer_name column to distinguish multiple interviewers per job
ALTER TABLE public.interviewer_models
ADD COLUMN IF NOT EXISTS interviewer_name TEXT;

-- Drop existing unique constraint
ALTER TABLE public.interviewer_models
DROP CONSTRAINT IF EXISTS interviewer_models_job_id_user_id_key;

-- Add new unique constraint including interviewer_name
ALTER TABLE public.interviewer_models
ADD CONSTRAINT interviewer_models_job_user_interviewer_key
UNIQUE (job_id, user_id, interviewer_name);

-- Update existing records to set interviewer_name from briefing
UPDATE public.interviewer_models
SET interviewer_name = briefing->'interviewer_models'->0->>'name'
WHERE interviewer_name IS NULL AND briefing IS NOT NULL;

-- Create index for faster lookups by job
CREATE INDEX IF NOT EXISTS idx_interviewer_models_job_user
ON public.interviewer_models(job_id, user_id);
