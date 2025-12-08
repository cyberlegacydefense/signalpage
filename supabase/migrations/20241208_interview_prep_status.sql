-- Add status tracking to interview_prep table for progress polling

-- Status: pending, generating_context, generating_questions, generating_answers, generating_tips, completed, failed
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS current_step INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS total_steps INTEGER NOT NULL DEFAULT 4;
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Index for polling queries
CREATE INDEX IF NOT EXISTS idx_interview_prep_status ON interview_prep(job_id, status);
