-- Smart Notifications & Enhanced Analytics
-- Adds visitor tracking, engagement scoring, and notification system

-- =============================================================================
-- HELPER FUNCTION
-- =============================================================================

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VISITOR TRACKING
-- =============================================================================

-- Add visitor fingerprint column to page_analytics
ALTER TABLE public.page_analytics
ADD COLUMN IF NOT EXISTS visitor_hash TEXT,
ADD COLUMN IF NOT EXISTS is_return_visitor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS time_on_page INTEGER, -- seconds
ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS language TEXT;

-- Index for visitor tracking
CREATE INDEX IF NOT EXISTS idx_page_analytics_visitor_hash ON public.page_analytics(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_page_analytics_return_visitor ON public.page_analytics(page_id, is_return_visitor) WHERE is_return_visitor = true;

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

-- Notification types enum
CREATE TYPE notification_type AS ENUM (
  'page_view',
  'return_visitor',
  'high_engagement',
  'weekly_digest'
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  page_id UUID REFERENCES public.signal_pages(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  is_emailed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- =============================================================================
-- USER NOTIFICATION SETTINGS
-- =============================================================================

CREATE TABLE public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_on_page_view BOOLEAN DEFAULT false,
  email_on_return_visitor BOOLEAN DEFAULT true,
  email_on_high_engagement BOOLEAN DEFAULT true,
  email_weekly_digest BOOLEAN DEFAULT true,
  digest_day TEXT DEFAULT 'monday', -- day of week
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- WEEKLY ANALYTICS SNAPSHOTS
-- =============================================================================

CREATE TABLE public.analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES public.signal_pages(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  total_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  return_visitors INTEGER DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0, -- seconds
  high_engagement_count INTEGER DEFAULT 0, -- views with 2+ minutes
  top_referrers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(page_id, week_start)
);

CREATE INDEX idx_analytics_snapshots_user ON public.analytics_snapshots(user_id);
CREATE INDEX idx_analytics_snapshots_week ON public.analytics_snapshots(week_start);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can view own notification settings"
  ON public.user_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON public.user_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON public.user_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Analytics snapshots policies
CREATE POLICY "Users can view own analytics snapshots"
  ON public.analytics_snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert notifications and snapshots
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can insert analytics snapshots"
  ON public.analytics_snapshots FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger for notification settings
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
