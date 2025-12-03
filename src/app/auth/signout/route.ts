import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Use NEXT_PUBLIC_APP_URL if available, otherwise fallback to request origin
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  return NextResponse.redirect(new URL('/', baseUrl), {
    status: 302,
  });
}
