-- Job Emails table for storing generated cover letters and interview emails
CREATE TABLE IF NOT EXISTS job_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email type and context
  email_type TEXT NOT NULL CHECK (email_type IN ('cover_letter', 'thank_you', 'follow_up', 'offer_discussion')),
  interview_round INTEGER, -- NULL for cover_letter, 1-5+ for interview emails
  interview_type TEXT CHECK (interview_type IN ('recruiter', 'hiring_manager', 'technical', 'panel', 'executive', 'hr_culture', 'other')),

  -- Email content
  subject TEXT,
  body TEXT NOT NULL,
  include_signalpage_link BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index that handles NULLs properly using COALESCE
CREATE UNIQUE INDEX idx_job_emails_unique
  ON job_emails(job_id, user_id, email_type, COALESCE(interview_round, 0), COALESCE(interview_type, ''));

-- Enable RLS
ALTER TABLE job_emails ENABLE ROW LEVEL SECURITY;

-- Users can only access their own emails
CREATE POLICY "Users can view own emails"
  ON job_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails"
  ON job_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails"
  ON job_emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails"
  ON job_emails FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_job_emails_job_user ON job_emails(job_id, user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_job_emails_updated_at
  BEFORE UPDATE ON job_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
