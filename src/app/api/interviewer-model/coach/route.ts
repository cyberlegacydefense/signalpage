import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasCoachAccess } from '@/lib/stripe';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

interface PracticeCoachRequest {
  jobId: string;
  interviewerName: string;
  interviewerContext: {
    currentRole: string;
    company: string;
    careerArchetype: string;
    whatImpressesThem: string;
    whatConcernsThem: string;
    hiringLens: string;
  };
  conversationHistory: Array<{
    role: 'interviewer' | 'candidate';
    content: string;
  }>;
  currentQuestion: string;
}

const SYSTEM_PROMPT = `You are an expert interview coach providing REAL-TIME guidance during a practice interview session.

The candidate is currently in a mock interview and needs help responding to the interviewer's latest question or statement.

YOUR ROLE:
1. Quickly analyze what the interviewer is really asking/assessing
2. Suggest 2-3 key points the candidate should hit in their response
3. Provide a brief example of how to phrase key parts
4. Warn about any pitfalls to avoid with THIS specific interviewer

CRITICAL RULES:
- Be CONCISE - the candidate needs quick, actionable advice
- Focus on the CURRENT question, not general advice
- Consider the interviewer's personality and what impresses/concerns them
- Reference the candidate's actual resume experiences when suggesting talking points
- Use bullet points for scannability

FORMAT YOUR RESPONSE AS:
**What They're Really Asking:**
[1-2 sentences on the underlying assessment]

**Hit These Points:**
- [Key point 1 with brief example phrasing]
- [Key point 2 with brief example phrasing]
- [Key point 3 if relevant]

**Pitfall to Avoid:**
[One specific thing NOT to do with this interviewer]

**Strong Opening:**
"[Suggested opening line they can use or adapt]"`;

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

    const body: PracticeCoachRequest = await request.json();
    const { jobId, interviewerName, interviewerContext, conversationHistory, currentQuestion } = body;

    if (!jobId || !currentQuestion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Fetch resume
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

    // Format resume context
    const parsedResume = resume?.parsed_data;
    let resumeContext = 'No resume available';

    if (parsedResume?.experiences) {
      resumeContext = parsedResume.experiences.map((exp: {
        company: string;
        title: string;
        achievements: string[];
      }) => {
        return `${exp.title} at ${exp.company}: ${exp.achievements?.slice(0, 3).join('; ') || 'No achievements listed'}`;
      }).join('\n');
    }

    // Format conversation history
    const conversationText = conversationHistory.map(msg =>
      `${msg.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${msg.content}`
    ).join('\n\n');

    // Build the user message
    const userMessage = `INTERVIEWER PROFILE:
Name: ${interviewerName}
Role: ${interviewerContext.currentRole} at ${interviewerContext.company}
Type: ${interviewerContext.careerArchetype}
What Impresses Them: ${interviewerContext.whatImpressesThem}
What Concerns Them: ${interviewerContext.whatConcernsThem}
Their Hiring Lens: "${interviewerContext.hiringLens}"

---

TARGET ROLE: ${job.role_title} at ${job.company_name}

---

CANDIDATE'S KEY EXPERIENCES:
${resumeContext}

---

CONVERSATION SO FAR:
${conversationText}

---

CURRENT INTERVIEWER QUESTION/STATEMENT:
"${currentQuestion}"

---

Help me respond effectively to this. What should I say?`;

    // Call Claude Haiku for fast responses
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return NextResponse.json({
      advice: assistantMessage,
    });

  } catch (error) {
    console.error('[Practice Coach] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get coaching advice' },
      { status: 500 }
    );
  }
}
