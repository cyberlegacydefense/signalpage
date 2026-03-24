import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasCoachAccess } from '@/lib/stripe';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CoachRequest {
  jobId: string;
  questionId: string;
  question: string;
  whatTheyReLookingFor: string;
  suggestedAnswer?: string;
  messages: ChatMessage[];
}

const SYSTEM_PROMPT = `You are SignalPage Interview Coach — an expert who helps candidates prepare authentic, compelling interview answers based on their REAL experience.

CRITICAL RULES:
1. ONLY reference experiences that appear in the candidate's resume below
2. NEVER invent achievements, metrics, or experiences
3. Always attribute achievements to the correct company/role
4. Be conversational but focused
5. Provide actionable, specific guidance

YOUR APPROACH FOR INITIAL GUIDANCE:
1. Identify 1-2 experiences from their resume that best answer this question
2. Suggest a STAR structure using their actual experience
3. Highlight specific metrics/achievements they should mention
4. Warn about common pitfalls for this question type
5. Prepare them for likely follow-up questions

When the candidate asks follow-ups, stay focused on helping them craft the best possible answer using their real background. Be encouraging but honest about what works and what doesn't.

Keep responses focused and scannable — use headers and bullet points when helpful.`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, full_name')
      .eq('id', user.id)
      .single();

    if (!hasCoachAccess(profile?.subscription_tier || 'free')) {
      return NextResponse.json(
        { error: 'Interview Coach requires an Interview Coach subscription' },
        { status: 403 }
      );
    }

    const body: CoachRequest = await request.json();
    const { jobId, question, whatTheyReLookingFor, suggestedAnswer, messages } = body;

    if (!jobId || !question) {
      return NextResponse.json({ error: 'Job ID and question are required' }, { status: 400 });
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, company_name, role_title, job_description, resume_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Fetch resume - try job's resume first, then primary resume
    let resume = null;
    if (job.resume_id) {
      const { data: jobResume } = await supabase
        .from('resumes')
        .select('parsed_data')
        .eq('id', job.resume_id)
        .eq('user_id', user.id)
        .single();
      resume = jobResume;
    }

    if (!resume) {
      const { data: primaryResume } = await supabase
        .from('resumes')
        .select('parsed_data')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();
      resume = primaryResume;
    }

    if (!resume?.parsed_data) {
      return NextResponse.json(
        { error: 'No resume found. Please upload a resume first.' },
        { status: 400 }
      );
    }

    // Build context for first message
    const isInitialMessage = messages.length === 0;

    let userContextMessage = '';
    if (isInitialMessage) {
      const parsedResume = resume.parsed_data;

      // Format resume experiences
      const experiencesText = parsedResume.experiences?.map((exp: {
        company: string;
        title: string;
        start_date: string;
        end_date?: string;
        is_current?: boolean;
        description: string;
        achievements: string[];
      }) => {
        const dateRange = exp.end_date
          ? `${exp.start_date} - ${exp.end_date}`
          : `${exp.start_date} - Present`;
        return `**${exp.title} at ${exp.company}** (${dateRange})
${exp.description}
${exp.achievements?.length ? `Achievements:\n${exp.achievements.map((a: string) => `- ${a}`).join('\n')}` : ''}`;
      }).join('\n\n') || 'No experiences listed';

      const skillsText = parsedResume.skills?.join(', ') || 'No skills listed';

      userContextMessage = `CANDIDATE RESUME:
Name: ${profile?.full_name || 'Candidate'}

PROFESSIONAL EXPERIENCE:
${experiencesText}

SKILLS: ${skillsText}

---

TARGET ROLE: ${job.role_title} at ${job.company_name}

JOB REQUIREMENTS (Summary):
${job.job_description?.slice(0, 1500) || 'No job description available'}

---

INTERVIEW QUESTION:
"${question}"

WHAT INTERVIEWERS ARE LOOKING FOR:
${whatTheyReLookingFor}

${suggestedAnswer ? `SUGGESTED ANSWER (for reference):
${suggestedAnswer}

---` : '---'}

Help me prepare to answer this question using my actual experience. Start by identifying which of my experiences would be most relevant, then help me structure a compelling answer.`;
    }

    // Build messages for Claude
    const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (isInitialMessage) {
      claudeMessages.push({ role: 'user', content: userContextMessage });
    } else {
      // For follow-up messages, include conversation history
      for (const msg of messages) {
        claudeMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Call Claude Haiku for fast responses
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    // Extract response text
    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return NextResponse.json({
      message: assistantMessage,
    });

  } catch (error) {
    console.error('[Interview Coach] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get coaching response' },
      { status: 500 }
    );
  }
}
