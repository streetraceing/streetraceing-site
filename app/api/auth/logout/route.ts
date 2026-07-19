import { NextResponse } from 'next/server';

import { adminSessionCookie } from '@/utils/auth';

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(adminSessionCookie.name, '', {
    ...adminSessionCookie.options,
    maxAge: 0,
  });

  return response;
}
