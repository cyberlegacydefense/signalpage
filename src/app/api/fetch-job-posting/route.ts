import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Fetch the job posting page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SignalPage/1.0; +https://signalpage.ai)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Could not access the page (HTTP ${response.status}). Please copy and paste the job description manually.` },
          { status: 422 }
        );
      }

      const html = await response.text();

      // Extract text content from HTML
      const textContent = extractTextFromHtml(html);

      if (!textContent || textContent.length < 100) {
        return NextResponse.json(
          { error: 'Could not extract job description from the page. The page may require login or use JavaScript to load content. Please copy and paste the job description manually.' },
          { status: 422 }
        );
      }

      // Try to extract just the job description portion
      const jobDescription = extractJobDescription(textContent);

      return NextResponse.json({
        success: true,
        jobDescription,
        note: 'Please review and edit the extracted content as needed.',
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out. The page took too long to load. Please copy and paste the job description manually.' },
          { status: 422 }
        );
      }

      return NextResponse.json(
        { error: 'Could not access the job posting. The site may be blocking automated access. Please copy and paste the job description manually.' },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error('Error fetching job posting:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please copy and paste the job description manually.' },
      { status: 500 }
    );
  }
}

function extractTextFromHtml(html: string): string {
  // Remove script and style tags and their contents
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');

  // Replace common block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n');
  text = text.replace(/<(br|hr)[^>]*\/?>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&bull;/g, '•')
    .replace(/&#\d+;/g, ' ');

  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();

  return text;
}

function extractJobDescription(text: string): string {
  // Common job description section markers
  const startMarkers = [
    /job\s*description/i,
    /about\s*the\s*role/i,
    /about\s*this\s*role/i,
    /role\s*overview/i,
    /position\s*overview/i,
    /what\s*you['']?ll\s*do/i,
    /responsibilities/i,
    /the\s*opportunity/i,
  ];

  const endMarkers = [
    /apply\s*now/i,
    /submit\s*application/i,
    /how\s*to\s*apply/i,
    /equal\s*opportunity/i,
    /we\s*are\s*an\s*equal/i,
    /about\s*the\s*company/i,
    /about\s*us$/i,
    /similar\s*jobs/i,
    /related\s*jobs/i,
    /share\s*this\s*job/i,
  ];

  let startIndex = 0;
  let endIndex = text.length;

  // Find the start of the job description
  for (const marker of startMarkers) {
    const match = text.match(marker);
    if (match && match.index !== undefined) {
      // Take the earliest match that's not at the very beginning
      if (match.index > 50 && (startIndex === 0 || match.index < startIndex)) {
        startIndex = match.index;
      }
      break;
    }
  }

  // Find the end of the job description
  for (const marker of endMarkers) {
    const match = text.substring(startIndex).match(marker);
    if (match && match.index !== undefined) {
      const possibleEnd = startIndex + match.index;
      if (possibleEnd > startIndex + 200 && possibleEnd < endIndex) {
        endIndex = possibleEnd;
      }
    }
  }

  let extracted = text.substring(startIndex, endIndex).trim();

  // If we couldn't find markers, just take a reasonable portion
  if (startIndex === 0 && extracted.length > 8000) {
    extracted = extracted.substring(0, 8000) + '...';
  }

  // Limit to reasonable length
  if (extracted.length > 10000) {
    extracted = extracted.substring(0, 10000) + '...';
  }

  return extracted;
}
