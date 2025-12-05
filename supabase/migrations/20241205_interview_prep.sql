-- Interview Prep table for storing generated interview coaching data
CREATE TABLE IF NOT EXISTS interview_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role context analysis
  role_context JSONB NOT NULL DEFAULT '{}',

  -- Generated questions by category
  questions JSONB NOT NULL DEFAULT '{}',

  -- Personalized answers
  answers JSONB NOT NULL DEFAULT '[]',

  -- Quick strategic tips
  quick_tips JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one prep per job
  UNIQUE(job_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_interview_prep_job_id ON interview_prep(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_user_id ON interview_prep(user_id);

-- RLS policies
ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;

-- Users can only access their own interview prep
CREATE POLICY "Users can view their own interview prep"
  ON interview_prep FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interview prep"
  ON interview_prep FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview prep"
  ON interview_prep FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interview prep"
  ON interview_prep FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_interview_prep_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interview_prep_updated_at
  BEFORE UPDATE ON interview_prep
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_prep_updated_at();
