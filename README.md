# SignalPage.ai

An AI-powered job search platform that helps candidates stand out with role-specific landing pages, intelligent interview preparation, and compounding career insights.

**Tagline**: *Your resume shows where you've been. SignalPage shows what you'll do next.*

---

## Overview

SignalPage transforms the job search experience by replacing generic applications with personalized, AI-generated content that demonstrates clear alignment between a candidate's experience and target opportunities. The platform learns from each application, building a compounding intelligence layer that makes every subsequent application stronger.

### Core Value Propositions

1. **Signal Pages** — Role-specific landing pages that map your experience directly to job requirements
2. **Interview Coach** — AI-generated interview questions and personalized answer scripts based on your resume and the specific job
3. **Interviewer Model** — Practice interviews with AI personas that simulate your actual interviewers based on their public profiles
4. **Career Intelligence** — A knowledge layer that compounds insights across all your applications
5. **Analytics** — Track who views your pages, what sections they focus on, and how long they engage

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth |
| AI | Anthropic Claude API (primary), OpenAI API (alternative) |
| Async Processing | Supabase Edge Functions (Deno runtime) |
| Payments | Stripe |
| Media | Cloudinary |
| Deployment | Netlify |

### Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── interviewer-model/    # Interviewer Model endpoints
│   │   ├── interview-prep/       # Interview Coach endpoints
│   │   ├── jobs/                 # Job management
│   │   ├── generate/             # Signal Page generation
│   │   └── ...
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Main application
│   │   ├── career/               # Career Intelligence
│   │   ├── analytics/            # Page view analytics
│   │   ├── jobs/[id]/generate/   # Page generation flow
│   │   ├── pages/[id]/           # Edit Signal Pages
│   │   └── profile/              # User profile
│   └── [username]/[slug]/        # Public Signal Page URLs
├── components/                   # React components
├── lib/                          # Core libraries
│   ├── llm/                      # AI provider abstraction
│   ├── supabase/                 # Database clients
│   ├── interviewer-model/        # Interviewer simulation engine
│   ├── career-intelligence/      # Career insights generation
│   └── analytics/                # Visitor tracking
└── types/                        # TypeScript definitions

supabase/
├── migrations/                   # Database schema migrations
└── functions/                    # Edge Functions (Deno)
    └── generate-interviewer-model/
```

---

## Features

### 1. Signal Pages

Role-specific landing pages that tell a compelling story about why you're the right fit for a specific role.

**Generated Content:**
- **Hero Section** — Personalized tagline and value proposition
- **Fit Section** — Maps your experience directly to job requirements
- **Career Highlights** — Your most relevant achievements with metrics
- **30/60/90 Day Plan** — Shows how you'd approach the first 90 days
- **Case Studies** — Deep dives into relevant projects
- **AI Commentary** — Strategic insights about the candidate-role alignment

**How It Works:**
1. User uploads resume and pastes job description
2. AI parses both documents and extracts structured data
3. AI generates each section, mapping experience to requirements
4. Page is published at a unique URL (`signalpage.ai/username/company-role`)
5. User can share link with recruiters/hiring managers

**Key Files:**
- `src/app/api/generate/route.ts` — Orchestrates page generation
- `src/lib/llm/generation-service.ts` — LLM generation logic
- `src/lib/llm/prompts.ts` — All generation prompts
- `src/app/[username]/[slug]/page.tsx` — Public page renderer

### 2. Interview Coach

AI-powered interview preparation tailored to the specific job and candidate background.

**Features:**
- 20+ predicted interview questions by category (behavioral, technical, culture fit, gap-probing)
- Personalized answer scripts using your actual resume experience
- Strength/gap analysis specific to this role
- Strategic quick tips for the interview

**Categories:**
- **Behavioral** — Based on job responsibilities and leadership expectations
- **Technical** — Based on required skills and tech stack
- **Culture Fit** — Based on company values
- **Gap-Probing** — Targeting potential weaknesses
- **Role-Specific** — Unique to the position

**Key Files:**
- `src/app/api/interview-prep/route.ts` — Interview prep generation
- `src/lib/llm/prompts.ts` — `INTERVIEW_COACH_SYSTEM_PROMPT` and related prompts

### 3. Interviewer Model

The most advanced feature — practice interviews with AI personas that simulate your actual interviewers.

**How It Works:**
1. User provides interviewer's public profile (LinkedIn, etc.)
2. AI analyzes the interviewer and builds a behavioral model:
   - Career archetype (e.g., "The Builder", "The Operator")
   - Thinking style (data-driven, narrative, collaborative, direct)
   - Communication patterns and language
   - Values and hot buttons
   - Likely interview behavior and questions
3. AI generates a comprehensive "Interviewer Model Briefing" with:
   - Predicted questions and why this person asks them
   - Rapport strategies and shared ground
   - Strategic positioning and vulnerability management
4. User can start a **Live Practice Session** where Claude role-plays AS the interviewer
5. After practice, AI provides a detailed debrief with moment-by-moment analysis

**Practice Modes:**
- **Full Interview** — Complete interview simulation with natural flow
- **Rapid Fire** — Quick succession of questions for volume practice
- **Stress Test** — Tough interviewer mode to pressure-test responses
- **Rapport Only** — Focus on the first 3-5 minutes of rapport building

**Session Persistence:**
- Practice sessions are stored in the database
- Users can leave and resume conversations
- Debriefs are saved for later review

**Key Files:**
- `src/app/api/interviewer-model/generate/route.ts` — Model generation trigger
- `src/app/api/interviewer-model/practice/route.ts` — Practice session management
- `supabase/functions/generate-interviewer-model/index.ts` — Async model generation
- `src/lib/interviewer-model/persona-engine.ts` — Persona prompt construction
- `src/lib/interviewer-model/pipeline.ts` — Model generation pipeline
- `src/components/InterviewerModelPractice.tsx` — Practice UI

### 4. Career Intelligence

A compounding knowledge layer that builds across all your applications.

**Components:**

**Application Brain** — Per-job analysis:
- Role seniority and expectations
- Skill themes and overlap with history
- Interview focus areas
- Strengths, gaps, and recommendations

**Career Narrative** — Your evolving professional story:
- Core identity statement
- Career throughline (the thread connecting your experience)
- Impact emphasis
- Leadership signals

**Career Assets** — Reusable stories and talking points:
- STAR-format stories
- Technical explanations
- Value propositions
- Tagged and searchable

**Key Files:**
- `src/lib/career-intelligence/generate.ts` — Generation logic
- `src/lib/llm/career-intelligence-prompts.ts` — Prompts
- `src/app/dashboard/career/page.tsx` — Career Intelligence dashboard

### 5. Analytics

Track engagement with your Signal Pages.

**Metrics:**
- Page views with referrer tracking
- Section-by-section engagement
- Time on page
- CTA clicks (calendar, contact, PDF download)
- Visitor fingerprinting for unique visitor counts

**Key Files:**
- `src/app/api/analytics/route.ts` — Analytics event ingestion
- `src/lib/analytics/` — Engagement scoring and fingerprinting
- `src/app/dashboard/analytics/page.tsx` — Analytics dashboard

### 6. Email Generation

Generate tailored outreach and follow-up emails.

**Types:**
- Cover letters
- Interview thank-you notes
- Recruiter outreach
- Follow-up emails

**Key Files:**
- `src/app/api/jobs/[id]/emails/route.ts` — Email generation

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends Supabase auth.users) |
| `resumes` | Uploaded resumes with parsed data (JSONB) |
| `jobs` | Target job postings |
| `signal_pages` | Generated landing pages (JSONB content) |
| `page_analytics` | Engagement events |

### Interview System

| Table | Purpose |
|-------|---------|
| `interview_prep` | Generated interview questions and answers |
| `interviewer_models` | AI-generated interviewer behavioral models |
| `practice_sessions` | Live practice session state and messages |

### Career Intelligence

| Table | Purpose |
|-------|---------|
| `application_brain` | Per-job analysis and recommendations |
| `career_narratives` | Evolving career story (versioned) |
| `career_assets` | Reusable stories and talking points |

### Security

All tables use Row Level Security (RLS):
- Users can only access their own data
- Published Signal Pages are publicly viewable
- Analytics events can be inserted by anyone (for tracking)

---

## Setup

### Prerequisites

- Node.js 20+
- Supabase account
- Anthropic API key
- Stripe account (for payments)
- Cloudinary account (optional, for media)

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=           # Optional

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Cloudinary
CLOUDINARY_URL=

# App
NEXT_PUBLIC_BASE_URL=
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
# (In Supabase SQL Editor, run each file in supabase/migrations/)

# Deploy edge functions
supabase functions deploy generate-interviewer-model

# Start development server
npm run dev
```

### Database Migrations

Migrations are in `supabase/migrations/` and should be run in order:

1. `001_initial_schema.sql` — Core tables
2. `002_add_resume_name.sql` through subsequent migrations
3. Latest: `20250310_practice_sessions_debrief.sql`

---

## AI Integration

### LLM Provider Abstraction

The app supports multiple AI providers through `src/lib/llm/`:

```typescript
import { getLLMClient } from '@/lib/llm';

const llm = getLLMClient();
const result = await llm.complete({
  messages: [...],
  config: {
    provider: 'anthropic',      // or 'openai'
    model: 'claude-3-5-haiku-20241022',
    temperature: 0.3,
    maxTokens: 2000
  }
});
```

### Models Used

| Use Case | Model |
|----------|-------|
| Signal Page Generation | Claude Sonnet |
| Interview Coach | Claude Sonnet |
| Interviewer Model | Claude Haiku (async) |
| Practice Sessions | Claude Haiku (real-time) |
| Career Intelligence | Claude Haiku |

### Edge Functions

Long-running AI tasks (like Interviewer Model generation) use Supabase Edge Functions:

1. API route creates a `generating` record
2. Invokes edge function asynchronously
3. Edge function calls Claude and updates record to `completed`
4. Client polls for status updates

---

## Key Flows

### Signal Page Generation

```
User Input (Resume + JD)
    ↓
Parse Resume → Structured JSON
Parse JD → Requirements
    ↓
Generate Hero → "Why I'm the fit for [Company]"
Generate Fit Section → Requirement mapping
Generate Highlights → Best achievements
Generate 30/60/90 → Onboarding plan
    ↓
Save to database
Publish at /username/slug
```

### Interviewer Model Practice

```
Add Interviewer (name + LinkedIn)
    ↓
Edge Function builds behavioral model
    ↓
User starts practice session
    ↓
Claude role-plays AS the interviewer
(Full character immersion, no AI acknowledgment)
    ↓
Session persisted to database
    ↓
End session → Generate debrief
(Moment-by-moment analysis, scores, improvement areas)
```

---

## Deployment

### Netlify

The app is configured for Netlify deployment with the `@netlify/plugin-nextjs` plugin.

```bash
# Build
npm run build

# The build output is automatically configured for Netlify
```

### Environment Setup

1. Set all environment variables in Netlify dashboard
2. Configure Stripe webhook endpoint: `https://yourapp.com/api/webhooks/stripe`
3. Deploy Supabase Edge Functions: `supabase functions deploy`

---

## Subscription Tiers

| Feature | Free | Pro |
|---------|------|-----|
| Signal Pages | 1 | Unlimited |
| Interview Coach | - | Included |
| Interviewer Model | - | Included |
| Career Intelligence | - | Included |
| Analytics | Basic | Full |

---

## Development

### Running Locally

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # Run ESLint
```

### Testing Edge Functions Locally

```bash
supabase start                    # Start local Supabase
supabase functions serve          # Run edge functions locally
```

---

## Contributing

SignalPage is a private project. For questions or support, contact info@signalpage.ai.

---

## License

Proprietary. All rights reserved.
