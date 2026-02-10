-- Profile Card feature: Add columns to profiles table for personal branding page
-- This enables users to create a permanent, non-chronological personal page
-- at /{username} that complements their job-specific Signal Pages.

-- Add profile card columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS positioning_statement TEXT,
ADD COLUMN IF NOT EXISTS superpowers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS calendar_link TEXT,
ADD COLUMN IF NOT EXISTS profile_card_enabled BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.positioning_statement IS 'Short tagline like "Product leader who turns ambiguity into outcomes"';
COMMENT ON COLUMN public.profiles.superpowers IS 'Array of superpower objects with title, one_liner, icon, pattern, proof_points, testimonial';
COMMENT ON COLUMN public.profiles.availability IS 'Object with status, roles, locations, start_date for job seeking status';
COMMENT ON COLUMN public.profiles.calendar_link IS 'Optional Calendly/Cal.com link for booking calls';
COMMENT ON COLUMN public.profiles.profile_card_enabled IS 'Whether the profile card is publicly visible at /{username}';

-- The existing RLS policies on profiles table already handle:
-- - Users can view/update their own profile
-- - Public can view profiles by username (for public pages)
-- No additional policies needed since we're just adding columns.
