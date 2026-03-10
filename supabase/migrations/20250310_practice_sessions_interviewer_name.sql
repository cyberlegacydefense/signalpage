-- Add interviewer_name to practice_sessions for easier display
ALTER TABLE public.practice_sessions
ADD COLUMN IF NOT EXISTS interviewer_name TEXT;

-- Create index for finding active sessions by job
CREATE INDEX IF NOT EXISTS idx_practice_sessions_job_status
ON public.practice_sessions(job_id, status);
