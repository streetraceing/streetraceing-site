import { NextResponse } from 'next/server';

import { isAdmin, isAuthConfigured } from '@/utils/auth';

export async function GET() {
  const response = NextResponse.json({
    authenticated: await isAdmin(),
    configured: isAuthConfigured(),
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
