import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAICommentary } from '@/lib/llm/generation-service';
import type { GenerationContext, ParsedResume, Job, User } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId } = await request.json();

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    // Get the signal page with job data
    const { data: page, error: pageError } = await supabase
      .from('signal_pages')
      .select(`
        *,
        jobs (*)
      `)
      .eq('id', pageId)
      .eq('user_id', user.id)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 400 }
      );
    }

    // Get user's primary resume
    const { data: resume } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (!resume || !resume.parsed_data) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 400 }
      );
    }

    // Build generation context
    const context: GenerationContext = {
      resume: resume.parsed_data as ParsedResume,
      job: page.jobs as Job,
      user: {
        full_name: profile.full_name,
        headline: profile.headline,
        about_me: profile.about_me,
      } as Pick<User, 'full_name' | 'headline' | 'about_me'>,
    };

    // Generate new AI commentary
    const ai_commentary = await generateAICommentary(context);

    // Update the page
    const { error: updateError } = await supabase
      .from('signal_pages')
      .update({ ai_commentary })
      .eq('id', pageId)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ ai_commentary });
  } catch (error) {
    console.error('Error regenerating commentary:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate commentary' },
      { status: 500 }
    );
  }
}
