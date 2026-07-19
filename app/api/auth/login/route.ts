import { NextResponse } from 'next/server';

import {
  adminSessionCookie,
  createAdminSessionToken,
  isAuthConfigured,
  isValidAdminPassword,
} from '@/utils/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let password = '';

  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json(
      { error: 'Некорректный запрос.' },
      { status: 400 },
    );
  }

  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: 'Авторизация пока не настроена.' },
      { status: 503 },
    );
  }

  if (!isValidAdminPassword(password)) {
    return NextResponse.json({ error: 'Неверный пароль.' }, { status: 401 });
  }

  const token = createAdminSessionToken();

  if (!token) {
    return NextResponse.json(
      { error: 'Не удалось создать сессию.' },
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
