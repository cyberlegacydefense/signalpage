import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBuildId(): string {
  // Try to read the BUILD_ID file that Next.js generates
  try {
    const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
    if (fs.existsSync(buildIdPath)) {
      return fs.readFileSync(buildIdPath, 'utf8').trim();
    }
  } catch {
    // Ignore errors reading BUILD_ID
  }

  // Fall back to Vercel's git commit SHA
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }

  // Development fallback
  return 'development';
}

export async function GET() {
  const buildId = getBuildId();

  return NextResponse.json({
    buildId,
    timestamp: Date.now()
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  });
}
