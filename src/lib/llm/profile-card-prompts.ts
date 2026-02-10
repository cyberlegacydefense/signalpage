import type { ParsedResume, Superpower, Availability } from '@/types';

// =============================================================================
// PROFILE CARD SYSTEM PROMPT
// =============================================================================

export const PROFILE_CARD_SYSTEM_PROMPT = `You are an expert personal branding strategist and career coach.

Your role is to help professionals create compelling Profile Cards that showcase their unique value proposition, superpowers, and professional identity.

You must:
- Create clear, memorable positioning that differentiates the candidate
- Identify patterns across their experience to surface true superpowers
- Ground everything in real achievements and metrics from their experience
- Write in a confident, authentic voice (not corporate jargon)
- Be specific and concrete, not generic

CRITICAL: Never invent facts. Use ONLY the provided data. Each proof point must come from real experience.`;

// =============================================================================
// PROFILE CARD GENERATION PROMPT
// =============================================================================

export const GENERATE_PROFILE_CARD_PROMPT = `Analyze the provided career data and generate a compelling Profile Card.

Your task is to create:
1. A memorable Positioning Statement (who they are in one sentence)
2. 3 Superpowers (their unique abilities with proof)
3. Suggested Availability settings

Return a JSON object with this exact structure:

{
  "positioning_statement": "A 10-15 word statement that captures their professional identity and unique value. Format: '[Role/Identity] who [unique ability/outcome]'. Examples: 'Product leader who turns ambiguity into shipped products', 'Engineer who makes complex systems simple'",

  "superpowers": [
    {
      "id": "uuid-string",
      "title": "Short, punchy title (2-4 words) like '0→1 Product Launches' or 'Data-Driven Growth'",
      "one_liner": "One sentence summary of this superpower",
      "icon": "One of: rocket, lightning, target, chart, puzzle, bulb, gear, users, code, shield, star, fire",
      "pattern": "2-3 sentences describing HOW they do this - their approach or methodology",
      "proof_points": [
        {
          "id": "uuid-string",
          "title": "Company @ Role or Project Name",
          "metric": "Specific quantified result (e.g., '$2M ARR', '40% faster', '10x improvement')",
          "details": "1-2 sentences of context (optional)"
        }
      ],
      "testimonial": null
    }
  ],

  "availability": {
    "status": "open",
    "roles": ["2-3 role titles they seem well-suited for based on their experience"],
    "locations": ["Infer from resume if possible, otherwise leave empty"],
    "start_date": "flexible"
  }
}

SUPERPOWER IDENTIFICATION GUIDELINES:
- Look for PATTERNS across multiple roles/projects, not one-off achievements
- Each superpower should be distinct (don't repeat similar themes)
- Prioritize superpowers with multiple proof points
- Choose icons that match the theme (rocket = launches, chart = growth, etc.)

PROOF POINT GUIDELINES:
- Include 1-2 proof points per superpower
- Each proof point must have a real metric from the data
- Correctly attribute each proof point to its source company/role

POSITIONING GUIDELINES:
- Make it memorable and specific, not generic
- Avoid buzzwords like "passionate", "results-driven", "innovative"
- Focus on what makes them DIFFERENT, not just good`;

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

export interface ProfileCardGenerationContext {
  resume: ParsedResume;
  user: {
    full_name: string;
    headline?: string;
    about_me?: string;
  };
  careerNarrative?: {
    core_identity?: string;
    career_throughline?: string;
    impact_emphasis?: string;
  } | null;
  signalPageHighlights?: Array<{
    company: string;
    role: string;
    problem: string;
    solution: string;
    impact: string;
    metrics?: string[];
  }>;
  existingSuperpowers?: Superpower[];
}

export function buildProfileCardContext(context: ProfileCardGenerationContext): string {
  const { resume, user, careerNarrative, signalPageHighlights, existingSuperpowers } = context;

  // Build resume context
  const experiences = resume.experiences
    .map(
      (exp, index) =>
        `[ROLE ${index + 1}]
Company: ${exp.company}
Title: ${exp.title}
Duration: ${exp.start_date} - ${exp.end_date || 'Present'}
Description: ${exp.description}
KEY ACHIEVEMENTS:
${exp.achievements.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}
${exp.technologies ? `Technologies: ${exp.technologies.join(', ')}` : ''}
[END ROLE ${index + 1}]`
    )
    .join('\n\n');

  const skills = resume.skills.join(', ');

  // Build highlights context from signal pages
  let highlightsContext = '';
  if (signalPageHighlights && signalPageHighlights.length > 0) {
    highlightsContext = `
## Previous SignalPage Highlights (already validated/curated)
${signalPageHighlights
  .map(
    (h, i) =>
      `${i + 1}. ${h.role} @ ${h.company}
   Problem: ${h.problem}
   Solution: ${h.solution}
   Impact: ${h.impact}
   ${h.metrics ? `Metrics: ${h.metrics.join(', ')}` : ''}`
  )
  .join('\n\n')}
`;
  }

  // Build career narrative context
  let narrativeContext = '';
  if (careerNarrative) {
    narrativeContext = `
## Existing Career Narrative
${careerNarrative.core_identity ? `Core Identity: ${careerNarrative.core_identity}` : ''}
${careerNarrative.career_throughline ? `Throughline: ${careerNarrative.career_throughline}` : ''}
${careerNarrative.impact_emphasis ? `Impact Style: ${careerNarrative.impact_emphasis}` : ''}
`;
  }

  return `
## Candidate Information
**Name**: ${user.full_name}
${user.headline ? `**Current Headline**: ${user.headline}` : ''}
${user.about_me ? `**About Me**: ${user.about_me}` : ''}

## Resume Summary
${resume.summary || 'Not provided'}

## Work Experience
${experiences}

## Skills
${skills}

${
  resume.projects && resume.projects.length > 0
    ? `
## Projects
${resume.projects.map((p) => `- ${p.name}: ${p.description}`).join('\n')}
`
    : ''
}

${narrativeContext}

${highlightsContext}
`.trim();
}
