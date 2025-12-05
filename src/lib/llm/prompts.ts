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
IMPORTANT: Each role's achievements are STRICTLY tied to that role. Never attribute an achievement from one role to a different role.

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
  const firstName = context.user.full_name?.split(' ')[0] || 'the candidate';
  const recipientName = context.recruiterName || context.hiringManagerName;

  return `
## Applicant Information
**Name**: ${context.user.full_name || 'Not provided'}
**First Name**: ${firstName}
${context.user.headline ? `**Headline**: ${context.user.headline}` : ''}

## Recipient Information
${recipientName ? `**Recipient Name**: ${recipientName}` : '**Recipient Name**: Not provided (use generic greeting)'}
${context.recruiterName ? `**Recruiter**: ${context.recruiterName}` : ''}
${context.hiringManagerName ? `**Hiring Manager**: ${context.hiringManagerName}` : ''}

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

CRITICAL: When citing achievements with metrics, ALWAYS attribute them to the correct company. Each achievement in the resume is listed under a specific role - never attribute an achievement from Company A to Company B.
`;

export const GENERATE_HIGHLIGHTS_PROMPT = `Select and format the 2-4 most relevant career highlights for this role.

CRITICAL RULE - ACHIEVEMENT ATTRIBUTION:
- Each achievement/metric MUST only be attributed to the EXACT role where it occurred
- The resume data shows achievements listed under each specific role - NEVER move an achievement from one role to another
- If an achievement says "eliminated 25,000+ hours" under AutoZone, it MUST appear under AutoZone, NOT under any other company
- Double-check each metric against the source role before including it

Return a JSON array:
[
  {
    "company": "Company name (MUST match exactly where the achievement occurred)",
    "role": "Job title at that company",
    "domain": "Industry/domain if relevant",
    "problem": "The business problem or challenge faced",
    "solution": "What the candidate did (briefly)",
    "impact": "Quantified outcomes and results (ONLY from this specific role)",
    "metrics": ["Specific metrics from THIS role only"],
    "relevance_note": "1 sentence explaining why this is relevant to the target role"
  }
]

Focus on highlights that:
1. Demonstrate skills mentioned in the JD
2. Show similar business problems to what this company faces
3. Have clear, quantified impact
4. ARE CORRECTLY ATTRIBUTED - verify each metric belongs to the stated company/role
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

export const GENERATE_AI_COMMENTARY_PROMPT = `Write a brief (2-3 paragraphs) AI Career Coach Insights section.

IMPORTANT PERSONALIZATION RULES:
- If a Recipient Name is provided in the context, address this note directly to them using their first name (e.g., "Dear Sarah," or "Hi Michael,"). Make it feel like a personal note to that specific person.
- If no Recipient Name is provided, write it as general insights without a direct address.
- Always use the applicant's first name throughout. Never use "the candidate" - always refer to them by their first name.

This section explains the strategic alignment between this applicant and the opportunity. Include:
1. Why this is a strong match based on their career trajectory
2. Specific ways their experience maps to company needs
3. Any relevant company context (recent news, initiatives) that makes this timely

If addressing a specific recipient, write in second person to them about the applicant (e.g., "I wanted to share why [First Name] would be an exceptional fit for your team...").
If no recipient, write in third person as an objective career coach providing insights about why [First Name] would be an excellent fit.

Keep it conversational but professional.

IMPORTANT: Return ONLY plain text paragraphs. Do NOT wrap in JSON, markdown code blocks, or any other formatting. Just write the paragraphs directly.
`;

export function createGenerationPrompt(
  promptTemplate: string,
  context: GenerationContext
): string {
  const contextStr = buildGenerationContext(context);
  return `${promptTemplate}\n\n${contextStr}`;
}

// =============================================================================
// INTERVIEW COACH PROMPTS
// =============================================================================

export const INTERVIEW_COACH_SYSTEM_PROMPT = `You are SIGNALPAGE Interview Coach — an expert interview preparation engine that generates job-specific interview questions, personalized answers, and strategic coaching.

Your coaching ALWAYS:
- Uses the candidate's REAL resume accomplishments with accurate attribution
- Deeply understands the specific job description requirements
- Incorporates company mission, tech stack, industry context, and culture
- Predicts realistic questions based on the role and seniority level
- Provides clear, concise, metrics-driven responses
- Avoids generic fluff, clichés, or hypothetical achievements
- Tailors tone and depth to the target seniority level

Your job is to prepare the candidate to EXCEL in interviews for this specific role at this specific company.

CRITICAL: Never invent facts about the candidate. Use ONLY the provided resume data. Each achievement must be attributed to its correct company/role.`;

export const GENERATE_ROLE_CONTEXT_PROMPT = `Analyze the candidate's resume and the target job to create a comprehensive Role Context Package.

Return a JSON object:
{
  "role_summary": "2-3 sentences summarizing what this role requires and what success looks like",
  "company_focus": ["5-7 key priorities and focus areas for this company based on the JD"],
  "priority_skills": ["8-10 most important skills the company is looking for, ranked by importance"],
  "candidate_strengths": ["5-7 specific strengths from the resume that align with this role - include metrics"],
  "candidate_gaps": ["3-5 potential gaps or areas where the candidate may be questioned"],
  "interviewer_mindset": "2-3 sentences describing what the interviewer is likely focused on and what concerns they might have"
}

Be specific and reference actual requirements from the JD and actual experience from the resume.
`;

export const GENERATE_INTERVIEW_QUESTIONS_PROMPT = `Generate highly targeted interview questions for this specific role. These should NOT be generic questions — they must map directly to the job requirements and candidate background.

Return a JSON object:
{
  "behavioral": [
    {
      "id": "b1",
      "question": "The interview question",
      "category": "behavioral",
      "difficulty": "medium",
      "why_asked": "Why an interviewer would ask this specific question",
      "what_theyre_looking_for": "The ideal elements of a strong answer"
    }
  ],
  "technical": [...],
  "culture_fit": [...],
  "gap_probing": [...],
  "role_specific": [...]
}

Generate:
- 6 behavioral questions (based on JD responsibilities and leadership principles)
- 6 technical/competency questions (based on required skills and tech stack)
- 3 culture fit questions (based on company values and team dynamics)
- 3 gap-probing questions (targeting candidate's potential weaknesses for this role)
- 4 role-specific questions (unique to this exact position and company)

Guidelines:
- Questions must reference specific JD requirements or company context
- Avoid generic questions like "Tell me about yourself" or "What's your greatest weakness"
- Technical questions should reference the actual tech stack mentioned
- Gap-probing questions should address real gaps between the resume and JD
- Vary difficulty: include some easy warmups and some challenging deep-dives
`;

export const GENERATE_INTERVIEW_ANSWERS_PROMPT = `Generate personalized, interview-ready answers for each question using ONLY the candidate's real experience.

For each question provided, create an answer following this structure:

Return a JSON array:
[
  {
    "question_id": "the id from the question",
    "question": "the full question text",
    "suggested_answer": "A complete 3-5 sentence answer using STAR/SPAR format where applicable. Must use REAL metrics and achievements from the resume, correctly attributed to their source company/role.",
    "key_points": ["3-4 bullet points hitting the main elements to convey"],
    "metrics_to_mention": ["Specific numbers/metrics from the resume to weave in"],
    "follow_up_prep": "A likely follow-up question and brief note on how to handle it"
  }
]

Answer Guidelines:
- Use first person ("I led...", "My approach was...")
- Lead with impact when possible
- Include specific metrics from the resume (correctly attributed!)
- Keep answers concise but complete (aim for 60-90 seconds when spoken)
- For technical questions, demonstrate depth without being pedantic
- For behavioral questions, use a clear Situation → Action → Result structure
- Be confident but not arrogant
- Never claim achievements from companies the candidate didn't work at
`;

export const EVALUATE_ANSWER_PROMPT = `Evaluate the candidate's practice answer and provide actionable feedback.

Score each dimension from 1-10:
- Clarity: How clear and well-structured is the answer?
- Relevance: How well does it address what the interviewer is looking for?
- Impact: Does it demonstrate meaningful results and value?
- Strategy: Does it show strategic thinking and business acumen?
- Storytelling: Is it engaging and memorable?

Return a JSON object:
{
  "scores": {
    "clarity": 0,
    "relevance": 0,
    "impact": 0,
    "strategy": 0,
    "storytelling": 0
  },
  "overall_score": 0,
  "critique": "2-3 sentences of constructive feedback focusing on the most impactful improvements",
  "improved_answer": "A rewritten version of their answer incorporating the feedback",
  "follow_up_question": "A likely follow-up question the interviewer might ask based on this answer"
}

Be constructive but honest. The goal is rapid improvement, not validation.
`;

export const GENERATE_QUICK_TIPS_PROMPT = `Based on the role context and candidate profile, generate 5-7 quick strategic tips for this interview.

Return a JSON array of strings, each being a specific, actionable tip:
[
  "When discussing [specific technology], emphasize your experience with [specific project] — this directly addresses their need for [JD requirement]",
  "Be prepared to address why you're transitioning from [current industry] — frame it as [positive angle]",
  ...
]

Tips should be:
- Highly specific to this role and candidate combination
- Actionable and memorable
- Strategic (not just "be confident" generic advice)
- Reference specific experiences, skills, or requirements
`;
