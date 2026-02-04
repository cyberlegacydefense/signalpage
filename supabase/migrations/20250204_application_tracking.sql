-- Migration: Add application status tracking to jobs
-- Tracks application progress and interview rounds with notes

-- Application status enum
CREATE TYPE application_status AS ENUM (
  'not_applied',
  'applied',
  'interview_scheduled',
  'interviewing',
  'offer_received',
  'rejected',
  'withdrawn',
  'accepted'
);

-- Add application tracking fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS application_status application_status DEFAULT 'not_applied',
ADD COLUMN IF NOT EXISTS interview_rounds JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS offer_received_at TIMESTAMPTZ;

-- Index for filtering by application status
CREATE INDEX IF NOT EXISTS idx_jobs_application_status
ON public.jobs(application_status);

-- Index for finding jobs with upcoming interviews
CREATE INDEX IF NOT EXISTS idx_jobs_interview_rounds
ON public.jobs USING GIN (interview_rounds);

-- Comment on the interview_rounds structure
COMMENT ON COLUMN public.jobs.interview_rounds IS 'Array of interview rounds: [{round: number, type: string, scheduled_at?: string, completed_at?: string, notes?: string, outcome?: "passed"|"pending"|"rejected"}]';
