-- SignalPage Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  headline TEXT,
  about_me TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  github_url TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Resumes table
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  raw_text TEXT NOT NULL,
  parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seniority level enum
CREATE TYPE seniority_level AS ENUM (
  'entry', 'mid', 'senior', 'staff', 'principal', 'director', 'vp', 'c_level'
);

-- Job status enum
CREATE TYPE job_status AS ENUM (
  'draft', 'generating', 'published', 'archived'
);

-- Jobs table (job postings the user is applying to)
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  job_description TEXT NOT NULL,
  company_url TEXT,
  job_posting_url TEXT,
  seniority_level seniority_level DEFAULT 'mid',
  status job_status DEFAULT 'draft',
  parsed_requirements JSONB,
  company_research JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Signal Pages (the generated landing pages)
CREATE TABLE public.signal_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,

  -- Generated content (stored as JSONB for flexibility)
  hero JSONB NOT NULL DEFAULT '{}'::jsonb,
  fit_section JSONB NOT NULL DEFAULT '{}'::jsonb,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_30_60_90 JSONB NOT NULL DEFAULT '{}'::jsonb,
  case_studies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_commentary TEXT,

  -- Customization
  custom_css TEXT,
  theme TEXT DEFAULT 'default',

  -- Metadata
  version INTEGER DEFAULT 1,
  generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_edited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint on user_id + slug
  UNIQUE(user_id, slug)
);

-- Analytics events enum
CREATE TYPE analytics_event_type AS ENUM (
  'page_view', 'section_view', 'case_study_click',
  'cta_click', 'pdf_download', 'calendar_click', 'contact_click'
);

-- Page analytics table
CREATE TABLE public.page_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES public.signal_pages(id) ON DELETE CASCADE NOT NULL,
  event_type analytics_event_type NOT NULL,
  section_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_signal_pages_user_id ON public.signal_pages(user_id);
CREATE INDEX idx_signal_pages_job_id ON public.signal_pages(job_id);
CREATE INDEX idx_signal_pages_slug ON public.signal_pages(slug);
CREATE INDEX idx_signal_pages_published ON public.signal_pages(is_published) WHERE is_published = true;
CREATE INDEX idx_page_analytics_page_id ON public.page_analytics(page_id);
CREATE INDEX idx_page_analytics_created_at ON public.page_analytics(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by username"
  ON public.profiles FOR SELECT
  USING (true);

-- Resumes policies
CREATE POLICY "Users can CRUD their own resumes"
  ON public.resumes FOR ALL
  USING (auth.uid() = user_id);

-- Jobs policies
CREATE POLICY "Users can CRUD their own jobs"
  ON public.jobs FOR ALL
  USING (auth.uid() = user_id);

-- Signal Pages policies
CREATE POLICY "Users can CRUD their own pages"
  ON public.signal_pages FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Published pages are publicly viewable"
  ON public.signal_pages FOR SELECT
  USING (is_published = true);

-- Analytics policies (anyone can insert, only owner can view)
CREATE POLICY "Anyone can insert analytics"
  ON public.page_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Page owners can view their analytics"
  ON public.page_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.signal_pages
      WHERE signal_pages.id = page_analytics.page_id
      AND signal_pages.user_id = auth.uid()
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '')),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_signal_pages_last_edited_at
  BEFORE UPDATE ON public.signal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
