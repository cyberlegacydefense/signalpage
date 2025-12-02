import type { GenerationContext, ParsedResume, Job } from '@/types';

export const SYSTEM_PROMPT = `You are an expert career coach and professional resume writer. You help job seekers create compelling, role-specific content that demonstrates clear alignment between their experience and target opportunities.

Your writing style is:
- Professional but not stuffy
- Specific and metrics-driven when possible
- Confident without being arrogant
- Focused on impact and outcomes, not just responsibilities

Always output valid JSON when asked for structured data.`;

export function buildResumeContext(resume: ParsedResume): string {
  const experiences = resume.experiences
    .map(
      (exp) =>
        `**${exp.title} at ${exp.company}** (${exp.start_date} - ${exp.end_date || 'Present'})
${exp.description}
Achievements: ${exp.achievements.join('; ')}
${exp.technologies ? `Technologies: ${exp.technologies.join(', ')}` : ''}`
    )
    .join('\n\n');

  const skills = resume.skills.join(', ');

  const projects = resume.projects
    ?.map(
      (proj) =>
        `**${proj.name}**: ${proj.description}
Technologies: ${proj.technologies.join(', ')}
Highlights: ${proj.highlights.join('; ')}`
    )
    .join('\n\n');

  return `
## Candidate Background

### Summary
${resume.summary || 'Not provided'}

### Work Experience
${experiences}

### Skills
${skills}

${projects ? `### Notable Projects\n${projects}` : ''}
`.trim();
}

export function buildJobContext(job: Job): string {
  const requirements = job.parsed_requirements;

  return `
## Target Role

**Position**: ${job.role_title} at ${job.company_name}
**Seniority Level**: ${job.seniority_level}

### Job Description
${job.job_description}

${
  requirements
    ? `
### Parsed Requirements
**Key Responsibilities**: ${requirements.responsibilities.join('; ')}
**Required Skills**: ${requirements.required_skills.join(', ')}
**Preferred Skills**: ${requirements.preferred_skills.join(', ')}
**Business Problems**: ${requirements.business_problems.join('; ')}
`
    : ''
}
`.trim();
}

export function buildGenerationContext(context: GenerationContext): string {
  return `
${buildResumeContext(context.resume)}

${buildJobContext(context.job)}

${
  context.companyResearch
    ? `
## Company Research
**About**: ${context.companyResearch.about || 'Not available'}
**Products**: ${context.companyResearch.products?.join(', ') || 'Not available'}
**Recent News**: ${context.companyResearch.recent_news?.join('; ') || 'Not available'}
**Tech Stack**: ${context.companyResearch.tech_stack?.join(', ') || 'Not available'}
`
    : ''
}
`.trim();
}

export const PARSE_JOB_PROMPT = `Analyze the following job description and extract structured information.

Return a JSON object with this exact structure:
{
  "responsibilities": ["list of 5-7 key responsibilities"],
  "required_skills": ["list of required technical skills and tools"],
  "preferred_skills": ["list of nice-to-have skills"],
  "business_problems": ["list of 2-4 business challenges this role addresses"],
  "role_context": "1-2 sentences about what success looks like in this role"
}

Job Description:
`;

export const PARSE_RESUME_PROMPT = `Parse the following resume text into structured data.

Return a JSON object with this exact structure:
{
  "summary": "professional summary or null",
  "experiences": [
    {
      "company": "company name",
      "title": "job title",
      "location": "location or null",
      "start_date": "YYYY-MM or approximate",
      "end_date": "YYYY-MM or null if current",
      "is_current": true/false,
      "description": "role description",
      "achievements": ["quantified achievements"],
      "technologies": ["technologies used"]
    }
  ],
  "education": [
    {
      "institution": "school name",
      "degree": "degree type",
      "field": "field of study or null",
      "end_date": "graduation year or null"
    }
  ],
  "skills": ["list of all skills mentioned"],
  "projects": [
    {
      "name": "project name",
      "description": "what it does",
      "technologies": ["tech used"],
      "highlights": ["key outcomes"]
    }
  ]
}

Resume Text:
`;

export const GENERATE_HERO_PROMPT = `Generate a compelling hero section for a job application landing page.

${buildGenerationContext.toString()}

Return a JSON object:
{
  "tagline": "A punchy 5-10 word tagline that captures the candidate's value proposition for this specific role",
  "value_promise": "1-2 sentences explaining the unique value this candidate brings to this company/role"
}

The tagline should be memorable and specific to the intersection of the candidate's strengths and the company's needs.
`;

export const GENERATE_FIT_SECTION_PROMPT = `Generate a "Why I'm a strong fit" section that explicitly maps the candidate's experience to the job requirements.

Return a JSON object:
{
  "intro": "Optional 1 sentence intro",
  "fit_bullets": [
    {
      "requirement": "A specific requirement from the job description",
      "evidence": "Concrete evidence from the candidate's background (with metrics if available)"
    }
  ]
}

Generate 4-6 fit bullets. Each should:
- Quote or paraphrase a real requirement from the JD
- Provide specific evidence with company names, metrics, and outcomes
- Be compelling but truthful based on the resume provided
`;

export const GENERATE_HIGHLIGHTS_PROMPT = `Select and format the 2-4 most relevant career highlights for this role.

Return a JSON array:
[
  {
    "company": "Company name",
    "role": "Job title",
    "domain": "Industry/domain if relevant",
    "problem": "The business problem or challenge faced",
    "solution": "What the candidate did (briefly)",
    "impact": "Quantified outcomes and results",
    "metrics": ["Specific metrics if available"],
    "relevance_note": "1 sentence explaining why this is relevant to the target role"
  }
]

Focus on highlights that:
1. Demonstrate skills mentioned in the JD
2. Show similar business problems to what this company faces
3. Have clear, quantified impact
`;

export const GENERATE_30_60_90_PROMPT = `Generate a thoughtful 30/60/90 day plan for this role.

Return a JSON object:
{
  "intro": "1-2 sentences setting context based on company research",
  "day_30": {
    "title": "First 30 Days: [Theme]",
    "objectives": ["3-4 learning/discovery objectives"],
    "deliverables": ["1-2 early deliverables if appropriate"]
  },
  "day_60": {
    "title": "Days 31-60: [Theme]",
    "objectives": ["3-4 execution objectives"],
    "deliverables": ["2-3 concrete deliverables"]
  },
  "day_90": {
    "title": "Days 61-90: [Theme]",
    "objectives": ["3-4 scale/impact objectives"],
    "deliverables": ["2-3 larger deliverables or initiatives"]
  }
}

The plan should:
- Reference specific technologies/tools from the JD
- Address business problems mentioned in the job description
- Be realistic for the seniority level
- Show the candidate understands the company's context
`;

export const GENERATE_CASE_STUDIES_PROMPT = `Select 2-3 projects from the candidate's background that would resonate most with this role.

Return a JSON array:
[
  {
    "title": "Project or initiative name",
    "relevance": "Why this matters for [Company Name]",
    "description": "2-3 sentences about what was built/achieved",
    "link": "URL if available from resume, or null"
  }
]

Prioritize:
1. Projects using technologies mentioned in the JD
2. Projects solving similar business problems
3. Projects with impressive outcomes
`;

export const GENERATE_AI_COMMENTARY_PROMPT = `Write a brief (2-3 paragraphs) AI coach commentary section.

This section explains the strategic alignment between the candidate and this opportunity. Include:
1. Why this is a strong match based on career trajectory
2. Specific ways the candidate's experience maps to company needs
3. Any relevant company context (recent news, initiatives) that makes this timely

Write in first person as if you're the candidate's advocate explaining the match to a recruiter.
Keep it conversational but professional.
`;

export function createGenerationPrompt(
  promptTemplate: string,
  context: GenerationContext
): string {
  const contextStr = buildGenerationContext(context);
  return `${promptTemplate}\n\n${contextStr}`;
}
