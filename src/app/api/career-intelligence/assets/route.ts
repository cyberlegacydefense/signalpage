import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasProAccess } from '@/lib/stripe';
import type { CareerAsset } from '@/types';

// GET - Retrieve career assets with optional filtering
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assetType = searchParams.get('type');
    const tag = searchParams.get('tag');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = supabase
      .from('career_assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (assetType) {
      query = query.eq('asset_type', assetType);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: assets, error } = await query;

    if (error) {
      console.error('[Career Assets] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
    }

    return NextResponse.json({ assets: assets || [] });

  } catch (error) {
    console.error('[Career Assets] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// POST - Create a new career asset
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!hasProAccess(profile?.subscription_tier || 'free')) {
      return NextResponse.json(
        { error: 'Career Intelligence requires a Pro or Coach subscription' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { asset_type, title, content, situation, task, action, result, tags, source_company, source_role } = body;

    if (!asset_type || !title || !content) {
      return NextResponse.json(
        { error: 'Asset type, title, and content are required' },
        { status: 400 }
      );
    }

    const { data: asset, error } = await supabase
      .from('career_assets')
      .insert({
        user_id: user.id,
        asset_type,
        title,
        content,
        situation: situation || null,
        task: task || null,
        action: action || null,
        result: result || null,
        tags: tags || [],
        source_company: source_company || null,
        source_role: source_role || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Career Assets] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
    }

    return NextResponse.json({ success: true, asset });

  } catch (error) {
    console.error('[Career Assets] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create asset' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing career asset
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id;
    delete updates.created_at;

    const { data: asset, error } = await supabase
      .from('career_assets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[Career Assets] Update error:', error);
      return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
    }

    return NextResponse.json({ success: true, asset });

  } catch (error) {
    console.error('[Career Assets] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update asset' },
      { status: 500 }
    );
  }
}

// DELETE - Delete or deactivate a career asset
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    if (permanent) {
      // Permanently delete
      const { error } = await supabase
        .from('career_assets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Career Assets] Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
      }
    } else {
      // Soft delete (deactivate)
      const { error } = await supabase
        .from('career_assets')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Career Assets] Deactivate error:', error);
        return NextResponse.json({ error: 'Failed to deactivate asset' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Career Assets] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
