-- Career Intelligence Feature - Phase 1
-- Tables: career_narratives, career_assets, application_brain, user_career_settings

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Asset types for career vault
CREATE TYPE career_asset_type AS ENUM (
  'star_story',
  'technical_explanation',
  'leadership_example',
  'failure_story'
);

-- =============================================================================
-- CAREER NARRATIVES TABLE
-- =============================================================================
-- Stores the user's evolving career story/identity
-- One active narrative per user, with version history

CREATE TABLE public.career_narratives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Core narrative components
  core_identity TEXT,                    -- 1-2 sentence professional identity
  career_throughline TEXT,               -- Why past roles lead to target roles
  impact_emphasis TEXT,                  -- Business impact framing
  leadership_signals TEXT,               -- Leadership/ownership examples

  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  source_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,  -- Job that triggered this version

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast lookup of active narrative
CREATE INDEX idx_career_narratives_user_active ON public.career_narratives(user_id, is_active) WHERE is_active = true;

-- =============================================================================
-- CAREER ASSETS TABLE (Vault)
-- =============================================================================
-- Reusable interview-ready content pieces

CREATE TABLE public.career_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Asset content
  asset_type career_asset_type NOT NULL,
  title TEXT NOT NULL,                   -- Short descriptive title
  content TEXT NOT NULL,                 -- Full interview-ready content

  -- For STAR stories
  situation TEXT,
  task TEXT,
  action TEXT,
  result TEXT,

  -- Tagging system (predefined + custom)
  tags TEXT[] DEFAULT '{}',              -- Array of tags

  -- Source tracking
  source_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  source_company TEXT,                   -- Company where this happened
  source_role TEXT,                      -- Role title when this happened

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for career assets
CREATE INDEX idx_career_assets_user ON public.career_assets(user_id);
CREATE INDEX idx_career_assets_type ON public.career_assets(user_id, asset_type);
CREATE INDEX idx_career_assets_tags ON public.career_assets USING GIN(tags);

-- =============================================================================
-- APPLICATION BRAIN TABLE
-- =============================================================================
-- Per-application analysis snapshots (all kept for history)

CREATE TABLE public.application_brain (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,

  -- Role analysis
  role_seniority TEXT,                   -- Assessed seniority level
  role_expectations TEXT,                -- What success looks like
  skill_themes TEXT[],                   -- Core skill themes identified

  -- Cross-application insights
  overlap_with_history JSONB,            -- How this relates to past applications

  -- Interview preparation
  interview_focus_areas TEXT[],          -- Likely interview topics
  risk_areas TEXT[],                     -- Potential red flags/concerns

  -- Readiness assessment
  strengths TEXT[],                      -- Strengths for this role
  gaps TEXT[],                           -- Gaps or weak signals
  recommendations TEXT[],                -- What to improve before interview

  -- Raw LLM output for reference
  raw_analysis JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for application brain
CREATE INDEX idx_application_brain_user ON public.application_brain(user_id);
CREATE INDEX idx_application_brain_job ON public.application_brain(job_id);
CREATE INDEX idx_application_brain_user_job ON public.application_brain(user_id, job_id);

-- =============================================================================
-- USER CAREER SETTINGS TABLE
-- =============================================================================
-- User preferences for career intelligence features

CREATE TABLE public.user_career_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Auto-generation settings
  auto_generate_on_application BOOLEAN DEFAULT true,
  auto_extract_from_resume BOOLEAN DEFAULT true,

  -- Notification preferences (for future use)
  notify_on_insights BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- PREDEFINED TAGS REFERENCE TABLE (optional, for UI dropdown)
-- =============================================================================

CREATE TABLE public.career_asset_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_name TEXT UNIQUE NOT NULL,
  tag_category TEXT,                     -- e.g., 'role_level', 'skill_type', 'context'
  is_system BOOLEAN DEFAULT true,        -- System tags vs user-created
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert predefined tags
INSERT INTO public.career_asset_tags (tag_name, tag_category, is_system) VALUES
  -- Role levels
  ('IC', 'role_level', true),
  ('Manager', 'role_level', true),
  ('Director', 'role_level', true),
  ('Architect', 'role_level', true),
  ('Technical Lead', 'role_level', true),
  ('Staff Engineer', 'role_level', true),
  ('Principal', 'role_level', true),
  ('VP', 'role_level', true),
  ('C-Level', 'role_level', true),

  -- Skill types
  ('Technical', 'skill_type', true),
  ('Non-technical', 'skill_type', true),
  ('Data-driven', 'skill_type', true),
  ('Process Improvement', 'skill_type', true),
  ('Strategic', 'skill_type', true),
  ('Tactical', 'skill_type', true),

  -- Context
  ('Cross-functional', 'context', true),
  ('Customer-facing', 'context', true),
  ('Team Building', 'context', true),
  ('Stakeholder Management', 'context', true),
  ('Crisis Management', 'context', true),
  ('Scaling', 'context', true),
  ('Turnaround', 'context', true);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.career_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_brain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_career_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_asset_tags ENABLE ROW LEVEL SECURITY;

-- Career narratives policies
CREATE POLICY "Users can view own career narratives"
  ON public.career_narratives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career narratives"
  ON public.career_narratives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career narratives"
  ON public.career_narratives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own career narratives"
  ON public.career_narratives FOR DELETE
  USING (auth.uid() = user_id);

-- Career assets policies
CREATE POLICY "Users can view own career assets"
  ON public.career_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career assets"
  ON public.career_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career assets"
  ON public.career_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own career assets"
  ON public.career_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Application brain policies
CREATE POLICY "Users can view own application brain"
  ON public.application_brain FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own application brain"
  ON public.application_brain FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own application brain"
  ON public.application_brain FOR DELETE
  USING (auth.uid() = user_id);

-- User career settings policies
CREATE POLICY "Users can view own career settings"
  ON public.user_career_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career settings"
  ON public.user_career_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career settings"
  ON public.user_career_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Career asset tags - everyone can read system tags
CREATE POLICY "Anyone can view career asset tags"
  ON public.career_asset_tags FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER update_career_narratives_updated_at
  BEFORE UPDATE ON public.career_narratives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_career_assets_updated_at
  BEFORE UPDATE ON public.career_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_career_settings_updated_at
  BEFORE UPDATE ON public.user_career_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
