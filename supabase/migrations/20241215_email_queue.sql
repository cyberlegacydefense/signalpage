-- Email Queue for Zapier Integration
-- Zapier watches this table and sends emails via Zoho

-- =============================================================================
-- EMAIL QUEUE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'weekly_digest', 'return_visitor', 'high_engagement', 'page_view'
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sent_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_pending ON public.email_queue(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_email_queue_user ON public.email_queue(user_id);
CREATE INDEX idx_email_queue_type ON public.email_queue(email_type);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own email queue (for debugging/transparency)
CREATE POLICY "Users can view own email queue"
  ON public.email_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (from edge function)
CREATE POLICY "Service can insert email queue"
  ON public.email_queue FOR INSERT
  WITH CHECK (true);

-- Service role can update (for Zapier to mark as sent)
CREATE POLICY "Service can update email queue"
  ON public.email_queue FOR UPDATE
  USING (true);

-- =============================================================================
-- HELPER VIEW FOR ZAPIER
-- =============================================================================

-- Zapier can poll this view for pending emails
CREATE OR REPLACE VIEW public.pending_emails AS
SELECT
  id,
  to_email,
  to_name,
  subject,
  body_html,
  body_text,
  email_type,
  metadata,
  created_at
FROM public.email_queue
WHERE status = 'pending'
ORDER BY created_at ASC;

-- =============================================================================
-- FUNCTION TO MARK EMAIL AS SENT
-- =============================================================================

-- Zapier calls this after sending
CREATE OR REPLACE FUNCTION mark_email_sent(email_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.email_queue
  SET status = 'sent', sent_at = NOW()
  WHERE id = email_id;
END;
$$;

-- Function to mark email as failed
CREATE OR REPLACE FUNCTION mark_email_failed(email_id UUID, error_msg TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.email_queue
  SET status = 'failed', error_message = error_msg
  WHERE id = email_id;
END;
$$;
