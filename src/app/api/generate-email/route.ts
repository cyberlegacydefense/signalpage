import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLLMClient } from '@/lib/llm';
import { buildGenerationContext } from '@/lib/llm/prompts';
import { hasProAccess } from '@/lib/stripe';
import type { GenerationContext } from '@/types';

export const maxDuration = 60;

// Email type definitions
type EmailType = 'cover_letter' | 'thank_you' | 'follow_up' | 'offer_discussion';
type InterviewType = 'recruiter' | 'hiring_manager' | 'technical' | 'panel' | 'executive' | 'hr_culture' | 'other';

interface GenerateEmailRequest {
  jobId: string;
  emailType: EmailType;
  interviewRound?: number;
  interviewType?: InterviewType;
  includeSignalpageLink?: boolean;
}

interface EmailRecord {
  id: string;
  job_id: string;
  user_id: string;
  email_type: EmailType;
  interview_round: number | null;
  interview_type: InterviewType | null;
  subject: string | null;
  body: string;
  include_signalpage_link: boolean;
  created_at: string;
  updated_at: string;
}

// Prompts for different email types
const EMAIL_PROMPTS: Record<EmailType, string> = {
  cover_letter: `Write a compelling cover letter for this job application.

The cover letter should:
- Open with a strong hook that shows genuine interest in the company/role
- Highlight 2-3 most relevant achievements from the resume that match job requirements
- Demonstrate knowledge of the company and why the candidate is excited about this opportunity
- Be concise (3-4 paragraphs max)
- End with a clear call to action
- Sound professional but personable, not generic

Return a JSON object:
{
  "subject": "Application for [Role Title] - [Candidate Name]",
  "body": "The full cover letter text with proper paragraph breaks using \\n\\n"
}`,

  thank_you: `Write a thank you email following an interview.

Context provided:
- Interview Round: {{round}}
- Interview Type: {{interviewType}}

The thank you email should:
- Thank the interviewer(s) for their time
- Reference specific topics discussed (infer from job description and interview type)
- Reinforce why the candidate is a strong fit
- Address any potential concerns based on the interview type
- Be concise (2-3 paragraphs)
- Include next steps or express enthusiasm for moving forward

For different interview types, adjust tone:
- Recruiter: Professional, enthusiastic about opportunity
- Hiring Manager: Focus on team fit and leadership alignment
- Technical: Reference technical discussions, problem-solving approach
- Panel: Acknowledge multiple perspectives, team collaboration
- Executive: Strategic thinking, company vision alignment
- HR/Culture: Values alignment, cultural fit

Return a JSON object:
{
  "subject": "Thank You - [Role Title] Interview (Round {{round}})",
  "body": "The full email text with proper paragraph breaks using \\n\\n"
}`,

  follow_up: `Write a follow-up email for a candidate awaiting a decision.

Context provided:
- Interview Round completed: {{round}}
- Last interview type: {{interviewType}}

The follow-up email should:
- Be polite and not pushy
- Reaffirm interest in the role
- Briefly mention continued enthusiasm
- Ask for a timeline update if appropriate
- Be very concise (2 short paragraphs)

Return a JSON object:
{
  "subject": "Following Up - [Role Title] Application",
  "body": "The full email text with proper paragraph breaks using \\n\\n"
}`,

  offer_discussion: `Write an email to discuss a job offer.

The email should:
- Express gratitude for the offer
- Show enthusiasm for the opportunity
- Set up a conversation to discuss details (don't negotiate in email)
- Be professional and gracious
- Be concise (2-3 paragraphs)

Return a JSON object:
{
  "subject": "Re: [Role Title] Offer - Discussion",
  "body": "The full email text with proper paragraph breaks using \\n\\n"
}`
};

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  recruiter: 'Recruiter Screen',
  hiring_manager: 'Hiring Manager',
  technical: 'Technical Interview',
  panel: 'Panel Interview',
  executive: 'Executive/Leadership',
  hr_culture: 'HR/Culture Fit',
  other: 'General Interview'
};

function buildEmailPrompt(
  emailType: EmailType,
  interviewRound?: number,
  interviewType?: InterviewType
): string {
  let prompt = EMAIL_PROMPTS[emailType];

  if (interviewRound) {
    prompt = prompt.replace(/\{\{round\}\}/g, String(interviewRound));
  }

  if (interviewType) {
    prompt = prompt.replace(/\{\{interviewType\}\}/g, INTERVIEW_TYPE_LABELS[interviewType]);
  }

  return prompt;
}

// Helper to extract JSON from LLM response
function extractJSON(content: string): string {
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  return content.trim();
}

// POST - Generate a new email
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription tier - Pro only
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!hasProAccess(profile?.subscription_tier || 'free')) {
      return NextResponse.json(
        { error: 'Email generation requires a Pro subscription' },
        { status: 403 }
      );
    }

    const body: GenerateEmailRequest = await request.json();
    const { jobId, emailType, interviewRound, interviewType, includeSignalpageLink = true } = body;

    if (!jobId || !emailType) {
      return NextResponse.json({ error: 'Job ID and email type are required' }, { status: 400 });
    }

    // Validate email type
    if (!['cover_letter', 'thank_you', 'follow_up', 'offer_discussion'].includes(emailType)) {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    // For non-cover-letter emails, require round and type
    if (emailType !== 'cover_letter' && emailType !== 'offer_discussion') {
      if (!interviewRound || !interviewType) {
        return NextResponse.json(
          { error: 'Interview round and type are required for this email type' },
          { status: 400 }
        );
      }
    }

    console.log(`[Email Gen] Job ${jobId}: Generating ${emailType} email`);

    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get resume data
    let resume = null;
    if (job.resume_id) {
      const { data: selectedResume } = await supabase
        .from('resumes')
        .select('parsed_data')
        .eq('id', job.resume_id)
        .eq('user_id', user.id)
        .maybeSingle();
      resume = selectedResume;
    }
    if (!resume) {
      const { data: primaryResume } = await supabase
        .from('resumes')
        .select('parsed_data')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();
      resume = primaryResume;
    }

    if (!resume?.parsed_data) {
      return NextResponse.json(
        { error: 'Please upload a resume before generating emails' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, headline, about_me')
      .eq('id', user.id)
      .single();

    // Build generation context
    const context: GenerationContext = {
      resume: resume.parsed_data,
      job: job,
      user: {
        full_name: userProfile?.full_name || null,
        headline: userProfile?.headline || null,
        about_me: userProfile?.about_me || null,
      },
      recruiterName: job.recruiter_name,
      hiringManagerName: job.hiring_manager_name,
    };

    const contextStr = buildGenerationContext(context);
    const emailPrompt = buildEmailPrompt(emailType, interviewRound, interviewType);

    // Generate email with LLM
    const llm = getLLMClient();
    const result = await llm.complete({
      messages: [
        {
          role: 'system',
          content: `You are an expert career coach helping job seekers write effective professional emails.
Write in first person as the candidate. Be professional but personable.
Always output valid JSON as specified in the prompt.`
        },
        {
          role: 'user',
          content: `${emailPrompt}\n\n${contextStr}`
        }
      ],
      config: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1500 },
    });

    // Parse response
    let emailContent: { subject: string; body: string };
    try {
      const extracted = extractJSON(result.content);
      emailContent = JSON.parse(extracted);
    } catch {
      console.error('[Email Gen] Failed to parse LLM response:', result.content);
      return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 });
    }

    // Get SignalPage URL if needed
    let signalPageUrl = '';
    if (includeSignalpageLink) {
      const { data: signalPage } = await supabase
        .from('signal_pages')
        .select('slug')
        .eq('job_id', jobId)
        .maybeSingle();

      if (signalPage?.slug) {
        signalPageUrl = `https://signalpage.ai/p/${signalPage.slug}`;
      }
    }

    // Append SignalPage link if enabled and available
    let finalBody = emailContent.body;
    if (includeSignalpageLink && signalPageUrl) {
      finalBody += `\n\nP.S. I've created a personalized page highlighting my fit for this role: ${signalPageUrl}`;
    }

    // Save to database (upsert based on unique constraint)
    const { data: savedEmail, error: saveError } = await supabase
      .from('job_emails')
      .upsert({
        job_id: jobId,
        user_id: user.id,
        email_type: emailType,
        interview_round: interviewRound || null,
        interview_type: interviewType || null,
        subject: emailContent.subject,
        body: finalBody,
        include_signalpage_link: includeSignalpageLink,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'job_id,user_id,email_type,interview_round,interview_type'
      })
      .select()
      .single();

    if (saveError) {
      console.error('[Email Gen] Failed to save email:', saveError);
      return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
    }

    console.log(`[Email Gen] Job ${jobId}: Email generated and saved`);

    return NextResponse.json({
      success: true,
      email: savedEmail
    });

  } catch (error) {
    console.error('[Email Gen] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email' },
      { status: 500 }
    );
  }
}

// GET - Retrieve saved emails for a job
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const { data: emails, error } = await supabase
      .from('job_emails')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Email Gen] Failed to fetch emails:', error);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    return NextResponse.json({ emails: emails || [] });

  } catch (error) {
    console.error('[Email Gen] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing email
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailId, subject, body: emailBody, includeSignalpageLink } = body;

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (subject !== undefined) updateData.subject = subject;
    if (emailBody !== undefined) updateData.body = emailBody;
    if (includeSignalpageLink !== undefined) updateData.include_signalpage_link = includeSignalpageLink;

    const { data: updatedEmail, error } = await supabase
      .from('job_emails')
      .update(updateData)
      .eq('id', emailId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[Email Gen] Failed to update email:', error);
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      email: updatedEmail
    });

  } catch (error) {
    console.error('[Email Gen] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update email' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an email
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('job_emails')
      .delete()
      .eq('id', emailId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Email Gen] Failed to delete email:', error);
      return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Email Gen] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete email' },
      { status: 500 }
    );
  }
}
