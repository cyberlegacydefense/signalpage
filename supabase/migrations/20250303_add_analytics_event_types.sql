-- Add missing event types to analytics_event_type enum
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'high_engagement';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'return_visitor';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'page_leave';
