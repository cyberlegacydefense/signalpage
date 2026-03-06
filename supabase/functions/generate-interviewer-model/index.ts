// Supabase Edge Function for Interviewer Model Generation
// Uses async pattern - saves results to database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Anthropic API call
async function callClaude(
  system: string,
  userMessage: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: options.maxTokens ?? 8192,
      temperature: options.temperature ?? 0.3,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text');
  return textBlock?.text || '';
}

// System prompt
const INTERVIEWER_MODEL_SYSTEM_PROMPT = `You are the Interviewer Model engine built into SignalPage.ai. Your purpose is to construct an AI representation of a specific interviewer so the candidate can prepare with a model that thinks like the person they're about to meet.

<role>
You are an analytical engine that builds a behavioral and cognitive model of a real interviewer from publicly available data. You think like an organizational psychologist who specializes in professional behavioral prediction.

Core principle: "Recruiters research you before every interview. Now you can do the same."
</role>

<ethics_boundary>
You ONLY analyze publicly available information. You do not speculate about private matters. If the provided interviewer data is thin, say so. Label your inferences as HIGH / MEDIUM / LOW confidence.
</ethics_boundary>

<output_format>
Respond ONLY with valid JSON matching this schema. No markdown, no preamble, no backticks.

{
  "meta": {
    "generated_at": "ISO timestamp",
    "candidate_name": "string",
    "target_role": "string",
    "target_company": "string",
    "model_confidence": "HIGH | MEDIUM | LOW"
  },
  "interviewer_models": [
    {
      "name": "string",
      "current_role": "string",
      "company": "string",
      "career_archetype": {
        "label": "e.g. 'The Builder', 'The Operator'",
        "description": "2-3 sentence characterization",
        "confidence": "HIGH | MEDIUM | LOW"
      },
      "thinking_style": {
        "primary_mode": "data_driven | narrative | collaborative | direct",
        "what_impresses_them": "string",
        "what_concerns_them": "string",
        "confidence": "HIGH | MEDIUM | LOW"
      },
      "communication_style": {
        "pace_preference": "brief_and_punchy | measured | conversational",
        "language_patterns": ["phrases they use"],
        "confidence": "HIGH | MEDIUM | LOW"
      },
      "values_and_priorities": {
        "hot_buttons": ["topics they care about"],
        "likely_dealbreakers": ["what they'd reject"],
        "confidence": "HIGH | MEDIUM | LOW"
      },
      "interview_behavior_model": {
        "likely_opening_style": "string",
        "likely_focus_areas": ["what they'll probe"],
        "red_flags_they_watch_for": ["warning signs"],
        "hiring_lens": "the core question they're trying to answer",
        "confidence": "HIGH | MEDIUM | LOW"
      }
    }
  ],
  "predicted_questions": [
    {
      "question": "The interview question",
      "category": "technical | behavioral | situational | culture_fit",
      "why_this_interviewer_asks_it": "string",
      "what_theyre_really_assessing": "string",
      "recommended_approach": {
        "framework": "STAR | direct_answer | data_first",
        "key_points_to_hit": ["from candidate's resume"],
        "mirror_language": ["terms to echo"]
      },
      "danger_zone": "what NOT to say",
      "confidence": "HIGH | MEDIUM | LOW"
    }
  ],
  "rapport_strategy": {
    "shared_ground": [
      {
        "topic": "what you have in common",
        "your_angle": "how to bring it up naturally"
      }
    ],
    "topics_to_avoid": ["things that might backfire"]
  },
  "strategic_positioning": {
    "your_narrative_arc": "2-sentence story of why YOU for THIS role",
    "key_differentiators": [
      {
        "differentiator": "what sets you apart",
        "why_this_interviewer_cares": "string",
        "how_to_surface_it": "string"
      }
    ],
    "vulnerability_management": [
      {
        "potential_concern": "a gap they might probe",
        "reframe_strategy": "how to address it"
      }
    ]
  }
}
</output_format>

Generate 5-7 predicted questions. Be specific to both the interviewer AND the candidate. Keep descriptions concise.`;

// Build user message
function buildUserMessage(input: {
  resume: string;
  jobDescription: string;
  interviewers: Array<{
    name: string;
    currentRole?: string;
    company?: string;
    linkedinText?: string;
    additionalContext?: string;
  }>;
}): string {
  const interviewerBlocks = input.interviewers.map((profile, i) => {
    const sections = [
      `<interviewer index="${i + 1}">`,
      `<name>${profile.name}</name>`,
      profile.currentRole ? `<current_role>${profile.currentRole}</current_role>` : '',
      profile.company ? `<company>${profile.company}</company>` : '',
      profile.linkedinText ? `<linkedin_profile>\n${profile.linkedinText}\n</linkedin_profile>` : '',
      profile.additionalContext ? `<additional_context>\n${profile.additionalContext}\n</additional_context>` : '',
      `</interviewer>`,
    ].filter(Boolean);

    return sections.join('\n');
  }).join('\n\n');

  return `<interviewer_model_request>

<candidate_resume>
${input.resume}
</candidate_resume>

<job_description>
${input.jobDescription}
</job_description>

<interviewers>
${interviewerBlocks}
</interviewers>

Build the Interviewer Model. Construct a behavioral representation of each interviewer. Be specific, strategic, and actionable.
</interviewer_model_request>`;
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let jobId: string | null = null;
  let userId: string | null = null;

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    jobId = body.jobId;
    userId = body.userId;
    const { resume, jobDescription, interviewers } = body;

    if (!jobId || !userId || !resume || !jobDescription || !interviewers?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Interviewer Model] Job ${jobId}: Starting generation...`);

    const userMessage = buildUserMessage({ resume, jobDescription, interviewers });

    const response = await callClaude(
      INTERVIEWER_MODEL_SYSTEM_PROMPT,
      userMessage,
      { temperature: 0.3, maxTokens: 8192 }
    );

    // Parse JSON response - handle markdown code blocks
    let cleaned = response.trim();

    // Remove markdown code blocks if present
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    } else {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }

    let briefing;
    try {
      briefing = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[Interviewer Model] JSON parse failed:', parseError);
      console.error('[Interviewer Model] Response length:', response.length);
      console.error('[Interviewer Model] Last 200 chars:', response.substring(response.length - 200));

      // Update status to failed
      await supabase
        .from('interviewer_models')
        .update({
          status: 'failed',
          error_message: 'Failed to parse model response',
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({ error: 'Failed to parse model response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save results to database
    const { error: updateError } = await supabase
      .from('interviewer_models')
      .update({
        status: 'completed',
        briefing,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Interviewer Model] Failed to save results:', updateError);
      throw updateError;
    }

    console.log(`[Interviewer Model] Job ${jobId}: Complete in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[Interviewer Model] Error after ${Date.now() - startTime}ms:`, error);

    // Update status to failed
    if (jobId && userId) {
      await supabase
        .from('interviewer_models')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Generation failed',
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)
        .eq('user_id', userId);
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate interviewer model',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
