-- Table to store practice session state
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  interviewer_model_id UUID REFERENCES public.interviewer_models(id) ON DELETE CASCADE,

  -- Session config
  mode TEXT NOT NULL DEFAULT 'full_interview', -- full_interview, rapid_fire, stress_test, rapport_only
  difficulty TEXT NOT NULL DEFAULT 'neutral', -- friendly, neutral, tough
  interviewer_index INTEGER DEFAULT 0,
  max_turns INTEGER DEFAULT 20,

  -- Session state
  status TEXT NOT NULL DEFAULT 'active', -- active, ended, debriefing
  messages JSONB DEFAULT '[]'::jsonb,
  system_prompt TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS policies
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own practice sessions"
  ON public.practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions"
  ON public.practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions"
  ON public.practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice sessions"
  ON public.practice_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_job ON public.practice_sessions(job_id);
