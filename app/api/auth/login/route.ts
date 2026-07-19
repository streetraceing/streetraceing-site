import { NextResponse } from 'next/server';

import {
  adminSessionCookie,
  createAdminSessionToken,
  isAuthConfigured,
  isValidAdminPassword,
} from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const strings = translations[getRequestLocale(request)].api.auth;
  let password = '';

  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json(
      { error: strings.invalidRequest },
      { status: 400 },
    );
  }

  if (!isAuthConfigured()) {
    return NextResponse.json({ error: strings.notConfigured }, { status: 503 });
  }

  if (!isValidAdminPassword(password)) {
    return NextResponse.json(
      { error: strings.invalidPassword },
      { status: 401 },
    );
  }

  const token = createAdminSessionToken();

  if (!token) {
    return NextResponse.json(
      { error: strings.sessionCreation },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(
    adminSessionCookie.name,
    token,
    adminSessionCookie.options,
  );

  return response;
}
