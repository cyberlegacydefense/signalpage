-- Add resume selection and recruiter/hiring manager personalization to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recruiter_name TEXT,
ADD COLUMN IF NOT EXISTS hiring_manager_name TEXT;

-- Add index for resume_id
CREATE INDEX IF NOT EXISTS idx_jobs_resume_id ON public.jobs(resume_id);
