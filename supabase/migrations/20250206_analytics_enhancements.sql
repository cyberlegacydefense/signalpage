-- Migration: Enhanced analytics with scroll depth tracking
-- Adds scroll depth column and creates efficient aggregation view

-- Add scroll depth tracking to page_analytics
ALTER TABLE public.page_analytics
ADD COLUMN IF NOT EXISTS scroll_depth INTEGER DEFAULT 0;

-- Comment on the column
COMMENT ON COLUMN public.page_analytics.scroll_depth IS 'Maximum scroll depth reached as percentage (0-100)';

-- Index for engagement queries
CREATE INDEX IF NOT EXISTS idx_page_analytics_scroll_depth
ON public.page_analytics(page_id, scroll_depth)
WHERE scroll_depth > 0;

-- Create view for efficient page engagement stats aggregation
CREATE OR REPLACE VIEW page_engagement_stats AS
SELECT
  page_id,
  COUNT(*) FILTER (WHERE event_type = 'page_view' AND (is_owner_view = false OR is_owner_view IS NULL)) as total_views,
  COUNT(DISTINCT visitor_hash) FILTER (WHERE event_type = 'page_view' AND (is_owner_view = false OR is_owner_view IS NULL)) as unique_visitors,
  COUNT(*) FILTER (WHERE is_return_visitor = true AND (is_owner_view = false OR is_owner_view IS NULL)) as return_visitors,
  COALESCE(AVG(time_on_page) FILTER (WHERE time_on_page > 0 AND (is_owner_view = false OR is_owner_view IS NULL)), 0)::INTEGER as avg_time_on_page,
  COALESCE(AVG(scroll_depth) FILTER (WHERE scroll_depth > 0 AND (is_owner_view = false OR is_owner_view IS NULL)), 0)::INTEGER as avg_scroll_depth,
  COUNT(*) FILTER (WHERE time_on_page >= 120 AND (is_owner_view = false OR is_owner_view IS NULL)) as high_engagement_count,
  MIN(created_at) FILTER (WHERE event_type = 'page_view' AND (is_owner_view = false OR is_owner_view IS NULL)) as first_view_at,
  MAX(created_at) FILTER (WHERE event_type = 'page_view' AND (is_owner_view = false OR is_owner_view IS NULL)) as last_view_at
FROM public.page_analytics
GROUP BY page_id;

-- Grant access to the view
GRANT SELECT ON page_engagement_stats TO authenticated;
GRANT SELECT ON page_engagement_stats TO anon;
