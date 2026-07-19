import { NextResponse } from 'next/server';

import { isAdmin, isAuthConfigured } from '@/utils/auth';

export async function GET() {
  return NextResponse.json({
    authenticated: await isAdmin(),
    configured: isAuthConfigured(),
  });
}
