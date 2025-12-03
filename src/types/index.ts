// Core domain types for SignalPage

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  headline?: string;
  about_me?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  github_url?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  name?: string;
  tag?: string;
  raw_text: string;
  parsed_data: ParsedResume;
  file_url?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const RESUME_TAGS = [
  { value: 'technical', label: 'Technical' },
  { value: 'ai', label: 'AI / ML' },
  { value: 'data', label: 'Data' },
  { value: 'management', label: 'Management' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'architect', label: 'Architect' },
  { value: 'general', label: 'General' },
] as const;

export interface ParsedResume {
  summary?: string;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  certifications?: string[];
  projects?: Project[];
}

export interface Experience {
  company: string;
  title: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  description: string;
  achievements: string[];
  technologies?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  start_date?: string;
  end_date?: string;
  gpa?: string;
}

export interface Project {
  name: string;
  description: string;
  url?: string;
  technologies: string[];
  highlights: string[];
}

export interface Job {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  job_description: string;
  company_url?: string;
  job_posting_url?: string;
  seniority_level: SeniorityLevel;
  status: JobStatus;
  parsed_requirements?: ParsedJobRequirements;
  created_at: string;
  updated_at: string;
}

export type SeniorityLevel = 'entry' | 'mid' | 'senior' | 'staff' | 'principal' | 'director' | 'vp' | 'c_level';
export type JobStatus = 'draft' | 'generating' | 'published' | 'archived';

export interface ParsedJobRequirements {
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  business_problems: string[];
  company_context?: string;
  role_context?: string;
}

export interface SignalPage {
  id: string;
  job_id: string;
  user_id: string;
  slug: string;
  is_published: boolean;

  // Generated content sections
  hero: HeroSection;
  fit_section: FitSection;
  highlights: HighlightSection[];
  plan_30_60_90: Plan306090;
  case_studies: CaseStudy[];
  ai_commentary?: string;
  show_ai_commentary?: boolean;

  // Match score
  match_score?: number;
  match_breakdown?: MatchBreakdown;

  // Metadata
  generated_at: string;
  last_edited_at: string;
  version: number;
}

export interface MatchBreakdown {
  skills_match: number;
  experience_match: number;
  requirements_match: number;
  matched_skills: string[];
  missing_skills: string[];
  total_required_skills: number;
  total_matched_skills: number;
}

export interface HeroSection {
  tagline: string;
  value_promise: string;
}

export interface FitSection {
  intro?: string;
  fit_bullets: FitBullet[];
}

export interface FitBullet {
  requirement: string;
  evidence: string;
}

export interface HighlightSection {
  company: string;
  role: string;
  domain?: string;
  problem: string;
  solution: string;
  impact: string;
  metrics?: string[];
  relevance_note?: string;
}

export interface Plan306090 {
  intro?: string;
  day_30: PlanPhase;
  day_60: PlanPhase;
  day_90: PlanPhase;
}

export interface PlanPhase {
  title: string;
  objectives: string[];
  deliverables?: string[];
}

export interface CaseStudy {
  title: string;
  relevance: string;
  description: string;
  link?: string;
  image_url?: string;
}

export interface PageAnalytics {
  id: string;
  page_id: string;
  event_type: AnalyticsEventType;
  section_id?: string;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
  timestamp: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export type AnalyticsEventType =
  | 'page_view'
  | 'section_view'
  | 'case_study_click'
  | 'cta_click'
  | 'pdf_download'
  | 'calendar_click'
  | 'contact_click';

// LLM Provider types
export type LLMProvider = 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerationContext {
  resume: ParsedResume;
  job: Job;
  user: Pick<User, 'full_name' | 'headline' | 'about_me'>;
  companyResearch?: CompanyResearch;
  recruiterName?: string | null;
  hiringManagerName?: string | null;
}

export interface CompanyResearch {
  about?: string;
  products?: string[];
  recent_news?: string[];
  culture_keywords?: string[];
  tech_stack?: string[];
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Form input types
export interface JobIntakeInput {
  company_name: string;
  role_title: string;
  job_description: string;
  company_url?: string;
  job_posting_url?: string;
  seniority_level: SeniorityLevel;
}

export interface ProfileInput {
  full_name: string;
  username: string;
  headline?: string;
  about_me?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  github_url?: string;
}
