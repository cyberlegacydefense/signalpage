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

// Interview Coach types
export interface InterviewPrep {
  id: string;
  job_id: string;
  user_id: string;

  // Role context analysis
  role_context: RoleContextPackage;

  // Generated questions
  questions: InterviewQuestions;

  // Personalized answers
  answers: InterviewAnswer[];

  // Metadata
  generated_at: string;
  updated_at: string;
}

export interface RoleContextPackage {
  role_summary: string;
  company_focus: string[];
  priority_skills: string[];
  candidate_strengths: string[];
  candidate_gaps: string[];
  interviewer_mindset: string;
}

export interface InterviewQuestions {
  behavioral: InterviewQuestion[];
  technical: InterviewQuestion[];
  culture_fit: InterviewQuestion[];
  gap_probing: InterviewQuestion[];
  role_specific: InterviewQuestion[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  why_asked: string;
  what_theyre_looking_for: string;
}

export type QuestionCategory = 'behavioral' | 'technical' | 'culture_fit' | 'gap_probing' | 'role_specific';

export interface InterviewAnswer {
  question_id: string;
  question: string;
  suggested_answer: string;
  key_points: string[];
  metrics_to_mention: string[];
  follow_up_prep: string;
}

export interface AnswerFeedback {
  scores: {
    clarity: number;
    relevance: number;
    impact: number;
    strategy: number;
    storytelling: number;
  };
  overall_score: number;
  critique: string;
  improved_answer: string;
  follow_up_question: string;
}

// =============================================================================
// Career Intelligence Types
// =============================================================================

// Career Narrative - User's evolving professional story
export interface CareerNarrative {
  id: string;
  user_id: string;
  core_identity: string | null;           // 1-2 sentence professional identity
  career_throughline: string | null;      // Why past roles lead here
  impact_emphasis: string | null;         // Business impact framing
  leadership_signals: string | null;      // Leadership/ownership examples
  version: number;
  is_active: boolean;
  source_job_id: string | null;
  created_at: string;
  updated_at: string;
}

// Career Asset Types
export type CareerAssetType = 'star_story' | 'technical_explanation' | 'leadership_example' | 'failure_story';

// Career Asset - Reusable interview-ready content
export interface CareerAsset {
  id: string;
  user_id: string;
  asset_type: CareerAssetType;
  title: string;
  content: string;
  // STAR components (for star_story type)
  situation?: string | null;
  task?: string | null;
  action?: string | null;
  result?: string | null;
  // Tagging
  tags: string[];
  // Source tracking
  source_job_id?: string | null;
  source_company?: string | null;
  source_role?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Application Brain - Per-application analysis snapshot
export interface ApplicationBrain {
  id: string;
  user_id: string;
  job_id: string;
  // Role analysis
  role_seniority: string | null;
  role_expectations: string | null;
  skill_themes: string[];
  // Cross-application insights
  overlap_with_history: ApplicationOverlap | null;
  // Interview preparation
  interview_focus_areas: string[];
  risk_areas: string[];
  // Readiness assessment
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  // Raw LLM output
  raw_analysis: Record<string, unknown> | null;
  created_at: string;
}

export interface ApplicationOverlap {
  similar_roles: string[];
  recurring_themes: string[];
  progression_narrative: string;
}

// User Career Settings
export interface UserCareerSettings {
  id: string;
  user_id: string;
  auto_generate_on_application: boolean;
  auto_extract_from_resume: boolean;
  notify_on_insights: boolean;
  created_at: string;
  updated_at: string;
}

// Career Asset Tag (predefined)
export interface CareerAssetTag {
  id: string;
  tag_name: string;
  tag_category: 'role_level' | 'skill_type' | 'context';
  is_system: boolean;
  created_at: string;
}

// Predefined tags constant
export const CAREER_ASSET_TAGS = {
  role_level: [
    'IC',
    'Manager',
    'Director',
    'Architect',
    'Technical Lead',
    'Staff Engineer',
    'Principal',
    'VP',
    'C-Level',
  ],
  skill_type: [
    'Technical',
    'Non-technical',
    'Data-driven',
    'Process Improvement',
    'Strategic',
    'Tactical',
  ],
  context: [
    'Cross-functional',
    'Customer-facing',
    'Team Building',
    'Stakeholder Management',
    'Crisis Management',
    'Scaling',
    'Turnaround',
  ],
} as const;

// Career Intelligence Generation Context
export interface CareerIntelligenceContext {
  resume: ParsedResume;
  job: Job;
  user: Pick<User, 'full_name' | 'headline' | 'about_me'>;
  signalPageContent?: Partial<SignalPage> | null;
  interviewFeedback?: string | null;
  applicationHistory?: ApplicationBrain[];
}

// Career Intelligence Generation Output
export interface CareerIntelligenceOutput {
  applicationBrain: Omit<ApplicationBrain, 'id' | 'user_id' | 'job_id' | 'created_at'>;
  careerNarrative: Omit<CareerNarrative, 'id' | 'user_id' | 'version' | 'is_active' | 'source_job_id' | 'created_at' | 'updated_at'>;
  careerAssets: Array<Omit<CareerAsset, 'id' | 'user_id' | 'is_active' | 'created_at' | 'updated_at'>>;
}

// =============================================================================
// NOTIFICATIONS & ENHANCED ANALYTICS
// =============================================================================

export type NotificationType = 'page_view' | 'return_visitor' | 'high_engagement' | 'weekly_digest';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  page_id?: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  is_emailed: boolean;
  created_at: string;
}

export interface UserNotificationSettings {
  id: string;
  user_id: string;
  email_on_page_view: boolean;
  email_on_return_visitor: boolean;
  email_on_high_engagement: boolean;
  email_weekly_digest: boolean;
  digest_day: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  user_id: string;
  page_id: string;
  week_start: string;
  total_views: number;
  unique_visitors: number;
  return_visitors: number;
  avg_time_on_page: number;
  high_engagement_count: number;
  top_referrers: Array<{ referrer: string; count: number }>;
  created_at: string;
}

export interface VisitorFingerprint {
  visitor_hash: string;
  screen_resolution: string;
  timezone: string;
  language: string;
}

export interface EnhancedAnalyticsEvent {
  pageId: string;
  eventType: AnalyticsEventType;
  sectionId?: string;
  metadata?: Record<string, unknown>;
  visitorFingerprint?: VisitorFingerprint;
  timeOnPage?: number;
}
