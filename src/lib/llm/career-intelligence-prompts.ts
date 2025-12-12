import type { CareerIntelligenceContext, ParsedResume, Job, ApplicationBrain } from '@/types';

// =============================================================================
// CAREER INTELLIGENCE SYSTEM PROMPT
// =============================================================================

export const CAREER_INTELLIGENCE_SYSTEM_PROMPT = `You are an expert career strategist, technical recruiter, hiring manager, and executive interview coach combined.

Your role is to help job seekers organize, clarify, and strengthen their professional identity, not to search for jobs or match listings.

You operate as a long-term career memory system, tracking role context, career narratives, reusable interview assets, and application-specific insights.

You must:
- Avoid generic advice
- Ground all insights in the user's real experience
- Optimize for interview readiness, clarity, and credibility
- Maintain consistency across resumes, interviews, and public SignalPage links

You do NOT act as a job board, ATS, or employer.

You help the user become measurably more hireable.

CRITICAL: Never invent facts about the candidate. Use ONLY the provided resume data. Each achievement must be attributed to its correct company/role.`;

// =============================================================================
// CAREER INTELLIGENCE GENERATION PROMPT
// =============================================================================

export const CAREER_INTELLIGENCE_PROMPT = `Analyze the provided career data and generate comprehensive career intelligence.

Your task is to:
1. Update the Application Brain (role-specific analysis)
2. Refine the Career Narrative (consistent professional story)
3. Extract Reusable Career Assets (interview-ready content)

Return a JSON object with this exact structure:

{
  "applicationBrain": {
    "role_seniority": "string - assessed seniority level (entry/mid/senior/staff/principal/director/vp/c_level)",
    "role_expectations": "string - 2-3 sentences on what success looks like in this role",
    "skill_themes": ["array of 5-7 core skill themes this role requires"],
    "overlap_with_history": {
      "similar_roles": ["past roles/applications with similar requirements"],
      "recurring_themes": ["skills/experiences that keep appearing across applications"],
      "progression_narrative": "string - how this role fits the candidate's career progression"
    },
    "interview_focus_areas": ["5-7 likely interview focus areas based on JD and candidate background"],
    "risk_areas": ["3-5 potential concerns or red flags an interviewer might have"],
    "strengths": ["5-7 specific strengths for this role with evidence from resume"],
    "gaps": ["3-5 gaps or weak signals to address"],
    "recommendations": ["4-6 actionable recommendations before the interview"]
  },
  "careerNarrative": {
    "core_identity": "1-2 sentences defining the candidate's professional identity - who they are at their core",
    "career_throughline": "2-3 sentences explaining why their past roles logically lead to this opportunity",
    "impact_emphasis": "2-3 sentences framing their career in terms of business impact, not task lists",
    "leadership_signals": "2-3 sentences highlighting leadership and ownership, even without formal management titles"
  },
  "careerAssets": [
    {
      "asset_type": "star_story",
      "title": "Short descriptive title",
      "content": "Full interview-ready narrative (3-5 sentences)",
      "situation": "The context/challenge",
      "task": "What needed to be done",
      "action": "What the candidate specifically did",
      "result": "Quantified outcome",
      "tags": ["relevant tags from: IC, Manager, Director, Architect, Technical Lead, Staff Engineer, Principal, VP, C-Level, Technical, Non-technical, Data-driven, Process Improvement, Strategic, Tactical, Cross-functional, Customer-facing, Team Building, Stakeholder Management, Crisis Management, Scaling, Turnaround"],
      "source_company": "Company where this occurred",
      "source_role": "Role title when this happened"
    }
  ]
}

ASSET GENERATION GUIDELINES:
- Generate 2-3 STAR stories (problem → action → outcome)
- Generate 1 technical/system explanation (if applicable based on background)
- Generate 1 leadership or influence example
- Generate 1 failure or challenge story with learning

Each asset should be:
- Role-agnostic where possible (reusable across interviews)
- Written in first person, interview-ready language
- Include specific metrics from the resume (correctly attributed)
- Tagged with applicable role types

NARRATIVE GUIDELINES:
- The narrative should be reusable across interviews
- Align with executive-level storytelling
- Avoid buzzwords and generic phrases
- Focus on concrete impact and unique value`;

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

export function buildCareerIntelligenceContext(context: CareerIntelligenceContext): string {
  const { resume, job, user, signalPageContent, interviewFeedback, applicationHistory } = context;

  // Build resume context
  const experiences = resume.experiences
    .map(
      (exp, index) =>
        `[ROLE ${index + 1}]
Company: ${exp.company}
Title: ${exp.title}
Dates: ${exp.start_date} - ${exp.end_date || 'Present'}
Description: ${exp.description}
ACHIEVEMENTS FOR THIS ROLE ONLY:
${exp.achievements.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}
${exp.technologies ? `Technologies: ${exp.technologies.join(', ')}` : ''}
[END ROLE ${index + 1}]`
    )
    .join('\n\n');

  const skills = resume.skills.join(', ');

  // Build application history context
  let historyContext = '';
  if (applicationHistory && applicationHistory.length > 0) {
    historyContext = `
## Previous Applications Summary
${applicationHistory
  .slice(0, 5)
  .map(
    (app, i) =>
      `${i + 1}. Role: ${app.role_seniority || 'Unknown'} | Themes: ${app.skill_themes?.slice(0, 3).join(', ') || 'N/A'} | Strengths: ${app.strengths?.slice(0, 2).join(', ') || 'N/A'}`
  )
  .join('\n')}
`;
  }

  return `
## Applicant Information
**Name**: ${user.full_name || 'Not provided'}
${user.headline ? `**Headline**: ${user.headline}` : ''}

## Candidate Background

### Summary
${resume.summary || 'Not provided'}

### Work Experience
IMPORTANT: Each role's achievements are STRICTLY tied to that role. Never attribute an achievement from one role to a different role.

${experiences}

### Skills
${skills}

## Target Role

**Position**: ${job.role_title} at ${job.company_name}
**Seniority Level**: ${job.seniority_level || 'Not specified'}

### Job Description
${job.job_description}

${
  job.parsed_requirements
    ? `
### Parsed Requirements
**Key Responsibilities**: ${job.parsed_requirements.responsibilities.join('; ')}
**Required Skills**: ${job.parsed_requirements.required_skills.join(', ')}
**Preferred Skills**: ${job.parsed_requirements.preferred_skills.join(', ')}
**Business Problems**: ${job.parsed_requirements.business_problems.join('; ')}
`
    : ''
}

${historyContext}

${
  signalPageContent
    ? `
## Existing SignalPage Content
**Tagline**: ${signalPageContent.hero?.tagline || 'N/A'}
**Value Promise**: ${signalPageContent.hero?.value_promise || 'N/A'}
**Match Score**: ${signalPageContent.match_score || 'N/A'}%
`
    : ''
}

${
  interviewFeedback
    ? `
## Prior Interview Feedback
${interviewFeedback}
`
    : ''
}
`.trim();
}

// =============================================================================
// ASSET EXTRACTION FROM RESUME (Initial Setup)
// =============================================================================

export const EXTRACT_ASSETS_FROM_RESUME_PROMPT = `Analyze the provided resume and extract reusable career assets.

Your task is to identify and format the candidate's best stories, achievements, and examples into interview-ready assets.

Return a JSON object:
{
  "careerAssets": [
    {
      "asset_type": "star_story | technical_explanation | leadership_example | failure_story",
      "title": "Short descriptive title",
      "content": "Full interview-ready narrative (3-5 sentences)",
      "situation": "The context/challenge (for STAR stories)",
      "task": "What needed to be done (for STAR stories)",
      "action": "What the candidate specifically did (for STAR stories)",
      "result": "Quantified outcome (for STAR stories)",
      "tags": ["relevant tags"],
      "source_company": "Company where this occurred",
      "source_role": "Role title when this happened"
    }
  ],
  "initialNarrative": {
    "core_identity": "1-2 sentences defining professional identity based on resume patterns",
    "career_throughline": "2-3 sentences on career progression story",
    "impact_emphasis": "Key impact themes across their career",
    "leadership_signals": "Leadership patterns even without formal titles"
  }
}

EXTRACTION GUIDELINES:
- Extract 4-6 STAR stories from achievements with quantified results
- Identify 1-2 technical explanations if applicable
- Find 1-2 leadership/influence examples
- Look for 1 failure/challenge story if apparent
- Each asset must be correctly attributed to its source company/role
- Use first person, interview-ready language
- Include specific metrics where available`;

export function buildResumeExtractionContext(resume: ParsedResume, userName: string | null): string {
  const experiences = resume.experiences
    .map(
      (exp, index) =>
        `[ROLE ${index + 1}]
Company: ${exp.company}
Title: ${exp.title}
Dates: ${exp.start_date} - ${exp.end_date || 'Present'}
Description: ${exp.description}
ACHIEVEMENTS:
${exp.achievements.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}
${exp.technologies ? `Technologies: ${exp.technologies.join(', ')}` : ''}
[END ROLE ${index + 1}]`
    )
    .join('\n\n');

  return `
## Candidate: ${userName || 'Unknown'}

### Summary
${resume.summary || 'Not provided'}

### Work Experience
${experiences}

### Skills
${resume.skills.join(', ')}

${
  resume.projects && resume.projects.length > 0
    ? `
### Projects
${resume.projects.map((p) => `- ${p.name}: ${p.description} (${p.technologies.join(', ')})`).join('\n')}
`
    : ''
}
`.trim();
}
