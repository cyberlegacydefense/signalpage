import { getLLMClient, type LLMMessage } from './index';
import {
  SYSTEM_PROMPT,
  PARSE_JOB_PROMPT,
  PARSE_RESUME_PROMPT,
  GENERATE_HERO_PROMPT,
  GENERATE_FIT_SECTION_PROMPT,
  GENERATE_HIGHLIGHTS_PROMPT,
  GENERATE_30_60_90_PROMPT,
  GENERATE_CASE_STUDIES_PROMPT,
  GENERATE_AI_COMMENTARY_PROMPT,
  buildGenerationContext,
} from './prompts';
import type {
  GenerationContext,
  ParsedJobRequirements,
  ParsedResume,
  HeroSection,
  FitSection,
  HighlightSection,
  Plan306090,
  CaseStudy,
  LLMConfig,
} from '@/types';

function parseJSONResponse<T>(content: string): T {
  // Try to extract JSON from markdown code blocks if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error('Failed to parse JSON response:', content);
    throw new Error('Failed to parse AI response as JSON');
  }
}

async function generateWithRetry<T>(
  messages: LLMMessage[],
  config?: Partial<LLMConfig>,
  maxRetries = 2
): Promise<T> {
  const client = getLLMClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await client.complete({ messages, config });
      return parseJSONResponse<T>(result.content);
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Add a hint to return valid JSON on retry
        messages = [
          ...messages,
          {
            role: 'assistant',
            content: 'I apologize, let me try again with valid JSON:',
          },
        ];
      }
    }
  }

  throw lastError;
}

export async function parseJobDescription(
  jobDescription: string,
  config?: Partial<LLMConfig>
): Promise<ParsedJobRequirements> {
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${PARSE_JOB_PROMPT}\n\n${jobDescription}` },
  ];

  return generateWithRetry<ParsedJobRequirements>(messages, config);
}

export async function parseResume(
  resumeText: string,
  config?: Partial<LLMConfig>
): Promise<ParsedResume> {
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${PARSE_RESUME_PROMPT}\n\n${resumeText}` },
  ];

  return generateWithRetry<ParsedResume>(messages, config);
}

export async function generateHeroSection(
  context: GenerationContext,
  config?: Partial<LLMConfig>
): Promise<HeroSection> {
  const contextStr = buildGenerationContext(context);
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${GENERATE_HERO_PROMPT}\n\n${contextStr}` },
  ];

  return generateWithRetry<HeroSection>(messages, config);
}

export async function generateFitSection(
  context: GenerationContext,
  config?: Partial<LLMConfig>
): Promise<FitSection> {
  const contextStr = buildGenerationContext(context);
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${GENERATE_FIT_SECTION_PROMPT}\n\n${contextStr}` },
  ];

  return generateWithRetry<FitSection>(messages, config);
}

export async function generateHighlights(
  context: GenerationContext,
  config?: Partial<LLMConfig>
): Promise<HighlightSection[]> {
  const contextStr = buildGenerationContext(context);
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${GENERATE_HIGHLIGHTS_PROMPT}\n\n${contextStr}` },
  ];

  return generateWithRetry<HighlightSection[]>(messages, config);
}

export async function generate306090Plan(
  context: GenerationContext,
  config?: Partial<LLMConfig>
): Promise<Plan306090> {
  const contextStr = buildGenerationContext(context);
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${GENERATE_30_60_90_PROMPT}\n\n${contextStr}` },
  ];

  return generateWithRetry<Plan306090>(messages, config);
}

export async function generateCaseStudies(
  context: GenerationContext,
  config?: Partial<LLMConfig>
): Promise<CaseStudy[]> {
  const contextStr = buildGenerationContext(context);
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${GENERATE_CASE_STUDIES_PROMPT}\n\n${contextStr}` },
  ];

  return generateWithRetry<CaseStudy[]>(messages, config);
}

export async function generateAICommentary(
  context: GenerationContext,
  config?: Partial<LLMConfig>
): Promise<string> {
  const client = getLLMClient();
  const contextStr = buildGenerationContext(context);
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${GENERATE_AI_COMMENTARY_PROMPT}\n\n${contextStr}` },
  ];

  const result = await client.complete({ messages, config });
  return result.content;
}

export interface FullPageGeneration {
  hero: HeroSection;
  fit_section: FitSection;
  highlights: HighlightSection[];
  plan_30_60_90: Plan306090;
  case_studies: CaseStudy[];
  ai_commentary: string;
}

export async function generateFullPage(
  context: GenerationContext,
  config?: Partial<LLMConfig>,
  onProgress?: (section: string, progress: number) => void
): Promise<FullPageGeneration> {
  const sections = [
    'hero',
    'fit_section',
    'highlights',
    'plan_30_60_90',
    'case_studies',
    'ai_commentary',
  ];

  const results: Partial<FullPageGeneration> = {};
  let completed = 0;

  // Generate sections in parallel where possible
  const [hero, fitSection, highlights] = await Promise.all([
    generateHeroSection(context, config).then((r) => {
      completed++;
      onProgress?.('hero', completed / sections.length);
      return r;
    }),
    generateFitSection(context, config).then((r) => {
      completed++;
      onProgress?.('fit_section', completed / sections.length);
      return r;
    }),
    generateHighlights(context, config).then((r) => {
      completed++;
      onProgress?.('highlights', completed / sections.length);
      return r;
    }),
  ]);

  results.hero = hero;
  results.fit_section = fitSection;
  results.highlights = highlights;

  // These depend on having a good understanding of the role
  const [plan306090, caseStudies, aiCommentary] = await Promise.all([
    generate306090Plan(context, config).then((r) => {
      completed++;
      onProgress?.('plan_30_60_90', completed / sections.length);
      return r;
    }),
    generateCaseStudies(context, config).then((r) => {
      completed++;
      onProgress?.('case_studies', completed / sections.length);
      return r;
    }),
    generateAICommentary(context, config).then((r) => {
      completed++;
      onProgress?.('ai_commentary', completed / sections.length);
      return r;
    }),
  ]);

  results.plan_30_60_90 = plan306090;
  results.case_studies = caseStudies;
  results.ai_commentary = aiCommentary;

  return results as FullPageGeneration;
}
