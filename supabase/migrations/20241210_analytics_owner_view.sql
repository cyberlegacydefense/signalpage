-- Add is_owner_view column to page_analytics
ALTER TABLE page_analytics ADD COLUMN IF NOT EXISTS is_owner_view BOOLEAN DEFAULT false;

-- Index for filtering owner views
CREATE INDEX IF NOT EXISTS idx_page_analytics_owner_view ON page_analytics(page_id, is_owner_view) WHERE is_owner_view = false;
