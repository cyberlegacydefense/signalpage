-- Table to store interviewer model generation results
CREATE TABLE IF NOT EXISTS public.interviewer_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, generating, completed, failed
  briefing JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(job_id, user_id)
);

-- RLS policies
ALTER TABLE public.interviewer_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interviewer models"
  ON public.interviewer_models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interviewer models"
  ON public.interviewer_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interviewer models"
  ON public.interviewer_models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interviewer models"
  ON public.interviewer_models FOR DELETE
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_interviewer_models_job_user ON public.interviewer_models(job_id, user_id);
