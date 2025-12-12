// Supabase Edge Function for Interview Prep Generation
// This runs in Deno with longer timeout than Netlify Edge Functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface RoleContextPackage {
  role_summary: string;
  company_focus: string[];
  priority_skills: string[];
  candidate_strengths: string[];
  candidate_gaps: string[];
  interviewer_mindset: string;
}

interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  why_asked: string;
  what_theyre_looking_for: string;
}

interface InterviewQuestions {
  behavioral: InterviewQuestion[];
  technical: InterviewQuestion[];
  culture_fit: InterviewQuestion[];
  gap_probing: InterviewQuestion[];
  role_specific: InterviewQuestion[];
}

interface InterviewAnswer {
  question_id: string;
  question: string;
  suggested_answer: string;
  key_points: string[];
  metrics_to_mention: string[];
  follow_up_prep: string;
}

// Prompts
const INTERVIEW_COACH_SYSTEM_PROMPT = `You are SIGNALPAGE Interview Coach — an expert interview preparation engine that generates job-specific interview questions, personalized answers, and strategic coaching.

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

const GENERATE_ROLE_CONTEXT_PROMPT = `Analyze the candidate's resume and the target job to create a comprehensive Role Context Package.

Return a JSON object:
{
  "role_summary": "2-3 sentences summarizing what this role requires and what success looks like",
  "company_focus": ["5-7 key priorities and focus areas for this company based on the JD"],
  "priority_skills": ["8-10 most important skills the company is looking for, ranked by importance"],
  "candidate_strengths": ["5-7 specific strengths from the resume that align with this role - include metrics"],
  "candidate_gaps": ["3-5 potential gaps or areas where the candidate may be questioned"],
  "interviewer_mindset": "2-3 sentences describing what the interviewer is likely focused on and what concerns they might have"
}

Be specific and reference actual requirements from the JD and actual experience from the resume.`;

const GENERATE_INTERVIEW_QUESTIONS_PROMPT = `Generate highly targeted interview questions for this specific role. These should NOT be generic questions — they must map directly to the job requirements and candidate background.

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
- Vary difficulty: include some easy warmups and some challenging deep-dives`;

const GENERATE_INTERVIEW_ANSWERS_PROMPT = `Generate personalized, interview-ready answers for each question using ONLY the candidate's real experience.

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
- Never claim achievements from companies the candidate didn't work at`;

const GENERATE_QUICK_TIPS_PROMPT = `Based on the role context and candidate profile, generate 5-7 quick strategic tips for this interview.

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
- Reference specific experiences, skills, or requirements`;

// Helper to extract JSON from LLM response
function extractJSON(content: string): string {
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  return content.trim();
}

// Helper to safely parse JSON
function safeParseJSON<T>(content: string, label: string): { data: T | null; error: string | null } {
  try {
    const extracted = extractJSON(content);
    const parsed = JSON.parse(extracted) as T;
    return { data: parsed, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown parse error';
    console.error(`[Interview Prep] JSON parse error in ${label}:`, errorMsg);
    console.error(`[Interview Prep] Raw content (first 500 chars):`, content.substring(0, 500));
    return { data: null, error: `Failed to parse ${label}: ${errorMsg}` };
  }
}

// OpenAI API call
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Build context string from job and resume data
function buildContextString(job: Record<string, unknown>, resume: Record<string, unknown>, userProfile: Record<string, unknown> | null): string {
  const experiences = (resume.experiences as Array<Record<string, unknown>> || [])
    .map((exp, index) =>
      `[ROLE ${index + 1}]
Company: ${exp.company}
Title: ${exp.title}
Dates: ${exp.start_date} - ${exp.end_date || 'Present'}
Description: ${exp.description}
ACHIEVEMENTS FOR THIS ROLE ONLY:
${(exp.achievements as string[] || []).map((a: string, i: number) => `  ${i + 1}. ${a}`).join('\n')}
${exp.technologies ? `Technologies: ${(exp.technologies as string[]).join(', ')}` : ''}
[END ROLE ${index + 1}]`
    )
    .join('\n\n');

  const skills = (resume.skills as string[] || []).join(', ');
  const requirements = job.parsed_requirements as Record<string, unknown> | null;

  return `
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

${requirements ? `
### Parsed Requirements
**Key Responsibilities**: ${(requirements.responsibilities as string[] || []).join('; ')}
**Required Skills**: ${(requirements.required_skills as string[] || []).join(', ')}
**Preferred Skills**: ${(requirements.preferred_skills as string[] || []).join(', ')}
**Business Problems**: ${(requirements.business_problems as string[] || []).join('; ')}
` : ''}

## Applicant Information
**Name**: ${userProfile?.full_name || 'Not provided'}
`.trim();
}

// Career Asset interface
interface CareerAsset {
  id: string;
  asset_type: string;
  title: string;
  content: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  tags: string[];
  source_company?: string;
  source_role?: string;
}

// Build condensed context for answer generation
function buildCondensedContext(
  job: Record<string, unknown>,
  resume: Record<string, unknown>,
  userProfile: Record<string, unknown> | null,
  careerAssets?: CareerAsset[]
): string {
  const experiences = resume.experiences as Array<Record<string, unknown>> || [];
  const skills = resume.skills as string[] || [];
  const requirements = job.parsed_requirements as Record<string, unknown> | null;

  // Build career assets context if available
  let assetsContext = '';
  if (careerAssets && careerAssets.length > 0) {
    const assetsByType: Record<string, CareerAsset[]> = {};
    careerAssets.forEach(asset => {
      if (!assetsByType[asset.asset_type]) {
        assetsByType[asset.asset_type] = [];
      }
      assetsByType[asset.asset_type].push(asset);
    });

    assetsContext = `
## Pre-Prepared Career Stories (USE THESE for relevant questions):
${Object.entries(assetsByType).map(([type, assets]) => `
### ${type.replace('_', ' ').toUpperCase()}:
${assets.map(a => `- **${a.title}** (${a.source_company || 'N/A'}): ${a.content}`).join('\n')}`).join('\n')}

IMPORTANT: When a question matches one of these pre-prepared stories, USE THE STORY as the basis for your answer. These have been curated by the candidate.
`;
  }

  return `
## Candidate: ${userProfile?.full_name || 'Candidate'}

## Key Experience:
${experiences.slice(0, 3).map(exp =>
  `- ${exp.title} at ${exp.company}: ${(exp.achievements as string[] || []).slice(0, 3).join('; ')}`
).join('\n')}

## Key Skills: ${skills.slice(0, 15).join(', ')}

## Target Role: ${job.role_title} at ${job.company_name}
Key Requirements: ${(requirements?.required_skills as string[] || []).slice(0, 10).join(', ') || 'See job description'}
${assetsContext}
`.trim();
}

// Update status in database
async function updateStatus(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  userId: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from('interview_prep')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId)
    .eq('user_id', userId);

  if (error) {
    console.error(`[Interview Prep] Failed to update status:`, error);
    throw error;
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let jobId: string | null = null;
  let userId: string | null = null;
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    const { jobId: jId, userId: uId } = await req.json();
    jobId = jId;
    userId = uId;

    if (!jobId || !userId) {
      return new Response(
        JSON.stringify({ error: 'jobId and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Interview Prep] Job ${jobId}: Starting generation for user ${userId}`);

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (jobError || !job) {
      console.error(`[Interview Prep] Job ${jobId}: Job not found`, jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get resume data
    let resume = null;
    if (job.resume_id) {
      const { data: selectedResume } = await supabase
        .from('resumes')
        .select('parsed_data')
        .eq('id', job.resume_id)
        .eq('user_id', userId)
        .maybeSingle();
      resume = selectedResume;
    }
    if (!resume) {
      const { data: primaryResume } = await supabase
        .from('resumes')
        .select('parsed_data')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .maybeSingle();
      resume = primaryResume;
    }

    if (!resume?.parsed_data) {
      await updateStatus(supabase, jobId, userId, {
        status: 'failed',
        error_message: 'No resume found',
      });
      return new Response(
        JSON.stringify({ error: 'No resume found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, headline, about_me')
      .eq('id', userId)
      .single();

    // Get career assets from vault (if available)
    const { data: careerAssets } = await supabase
      .from('career_assets')
      .select('id, asset_type, title, content, situation, task, action, result, tags, source_company, source_role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(20);

    console.log(`[Interview Prep] Job ${jobId}: Found ${careerAssets?.length || 0} career assets`);

    const contextStr = buildContextString(job, resume.parsed_data, userProfile);
    const condensedContext = buildCondensedContext(job, resume.parsed_data, userProfile, careerAssets || undefined);

    // Step 1: Generate Role Context
    console.log(`[Interview Prep] Job ${jobId}: Step 1 - Generating role context...`);
    await updateStatus(supabase, jobId, userId, {
      status: 'generating_context',
      current_step: 1,
    });

    const roleContextContent = await callOpenAI([
      { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
      { role: 'user', content: `${GENERATE_ROLE_CONTEXT_PROMPT}\n\n${contextStr}` },
    ], { temperature: 0.7, maxTokens: 2000 });

    const { data: roleContext, error: rcError } = safeParseJSON<RoleContextPackage>(roleContextContent, 'role context');
    if (rcError || !roleContext) {
      await updateStatus(supabase, jobId, userId, { status: 'failed', error_message: rcError || 'Failed to parse role context' });
      throw new Error(rcError || 'Failed to parse role context');
    }

    await updateStatus(supabase, jobId, userId, {
      role_context: roleContext,
      status: 'generating_questions',
      current_step: 2,
    });
    console.log(`[Interview Prep] Job ${jobId}: Step 1 complete in ${Date.now() - startTime}ms`);

    // Step 2: Generate Questions
    console.log(`[Interview Prep] Job ${jobId}: Step 2 - Generating questions...`);
    const questionsContent = await callOpenAI([
      { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
      { role: 'user', content: `${GENERATE_INTERVIEW_QUESTIONS_PROMPT}\n\nRole Context:\n${JSON.stringify(roleContext, null, 2)}\n\n${contextStr}` },
    ], { temperature: 0.8, maxTokens: 4000 });

    const { data: questions, error: qError } = safeParseJSON<InterviewQuestions>(questionsContent, 'questions');
    if (qError || !questions) {
      await updateStatus(supabase, jobId, userId, { status: 'failed', error_message: qError || 'Failed to parse questions' });
      throw new Error(qError || 'Failed to parse questions');
    }

    await updateStatus(supabase, jobId, userId, {
      questions,
      status: 'generating_answers',
      current_step: 3,
    });
    console.log(`[Interview Prep] Job ${jobId}: Step 2 complete - Generated ${
      questions.behavioral.length + questions.technical.length +
      questions.culture_fit.length + questions.gap_probing.length +
      questions.role_specific.length
    } questions in ${Date.now() - startTime}ms`);

    // Steps 3-7: Generate Answers for each category
    const categories: Array<{ key: keyof InterviewQuestions; label: string; step: number }> = [
      { key: 'behavioral', label: 'Behavioral', step: 3 },
      { key: 'technical', label: 'Technical', step: 4 },
      { key: 'culture_fit', label: 'Culture fit', step: 5 },
      { key: 'gap_probing', label: 'Gap probing', step: 6 },
      { key: 'role_specific', label: 'Role specific', step: 7 },
    ];

    const allAnswers: InterviewAnswer[] = [];

    for (const { key, label, step } of categories) {
      const categoryQuestions = questions[key] || [];

      if (categoryQuestions.length === 0) {
        console.log(`[Interview Prep] Job ${jobId}: Skipping ${label} (no questions)`);
        continue;
      }

      console.log(`[Interview Prep] Job ${jobId}: Step ${step} - Generating ${label} answers...`);
      await updateStatus(supabase, jobId, userId, {
        status: step === 3 ? 'generating_answers' : `generating_answers_${key}`,
        current_step: step,
      });

      const answersContent = await callOpenAI([
        { role: 'system', content: 'You are an expert interview coach. Generate concise, impactful interview answers using ONLY the candidate\'s real experience. Use STAR format. Be specific with metrics. Output valid JSON only - no markdown code blocks.' },
        { role: 'user', content: `${GENERATE_INTERVIEW_ANSWERS_PROMPT}\n\nQuestions:\n${JSON.stringify(categoryQuestions, null, 2)}\n\n${condensedContext}` },
      ], { temperature: 0.7, maxTokens: 2000 });

      const { data: newAnswers, error: aError } = safeParseJSON<InterviewAnswer[]>(answersContent, `${label} answers`);
      if (aError) {
        console.warn(`[Interview Prep] Job ${jobId}: Failed to parse ${label} answers, continuing...`);
        continue;
      }

      if (newAnswers && Array.isArray(newAnswers)) {
        allAnswers.push(...newAnswers);
      }

      await updateStatus(supabase, jobId, userId, { answers: allAnswers });
      console.log(`[Interview Prep] Job ${jobId}: ${label} complete - ${newAnswers?.length || 0} answers`);
    }

    // Step 8: Generate Tips
    console.log(`[Interview Prep] Job ${jobId}: Step 8 - Generating tips...`);
    await updateStatus(supabase, jobId, userId, {
      status: 'generating_tips',
      current_step: 8,
    });

    const tipsContent = await callOpenAI([
      { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
      { role: 'user', content: `${GENERATE_QUICK_TIPS_PROMPT}\n\nRole Context:\n${JSON.stringify(roleContext, null, 2)}\n\n${contextStr}` },
    ], { temperature: 0.8, maxTokens: 1000 });

    let quickTips: string[] = [];
    const { data: parsedTips } = safeParseJSON<string[]>(tipsContent, 'tips');
    if (parsedTips && Array.isArray(parsedTips)) {
      quickTips = parsedTips;
    }

    // Complete!
    await updateStatus(supabase, jobId, userId, {
      quick_tips: quickTips,
      status: 'completed',
      current_step: 9,
      generated_at: new Date().toISOString(),
      error_message: null,
    });

    console.log(`[Interview Prep] Job ${jobId}: Complete! Total time: ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ success: true, status: 'completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[Interview Prep] Job ${jobId || 'unknown'}: Error after ${Date.now() - startTime}ms:`, error);

    // Try to mark as failed
    if (supabase && jobId && userId) {
      try {
        await updateStatus(supabase, jobId, userId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Generation failed unexpectedly',
        });
      } catch {
        // Ignore errors in error handler
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate interview prep',
        status: 'failed',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
