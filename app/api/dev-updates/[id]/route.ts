import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { devUpdates } from '@/db/schema';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import { isDevUpdateTopic } from '@/utils/stats';

export const runtime = 'nodejs';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getUpdateId(context: RouteContext) {
  const { id } = await context.params;

  return UUID_PATTERN.test(id) ? id : undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  const locale = getRequestLocale(request);
  const strings = translations[locale].api;

  if (!(await isAdmin())) {
    return NextResponse.json({ error: strings.auth.required }, { status: 401 });
  }

  const id = await getUpdateId(context);

  if (!id) {
    return NextResponse.json(
      { error: strings.devNotes.notFound },
      { status: 404 },
    );
  }

  let body: {
    title?: unknown;
    content?: unknown;
    topic?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: strings.auth.invalidRequest },
      { status: 400 },
    );
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const topic = typeof body.topic === 'string' ? body.topic : '';

  if (!content || content.length > 8_000 || !isDevUpdateTopic(topic)) {
    return NextResponse.json(
      { error: strings.devNotes.invalid },
      { status: 400 },
    );
  }

  if (title.length > 160) {
    return NextResponse.json(
      { error: strings.devNotes.titleTooLong },
      { status: 400 },
    );
  }

  const [update] = await db
    .update(devUpdates)
    .set({ title: title || null, content, topic })
    .where(eq(devUpdates.id, id))
    .returning();

  if (!update) {
    return NextResponse.json(
      { error: strings.devNotes.notFound },
      { status: 404 },
    );
  }

  return NextResponse.json({ update });
}

export async function DELETE(request: Request, context: RouteContext) {
  const locale = getRequestLocale(request);
  const strings = translations[locale].api;

  if (!(await isAdmin())) {
    return NextResponse.json({ error: strings.auth.required }, { status: 401 });
  }

  const id = await getUpdateId(context);

  if (!id) {
    return NextResponse.json(
      { error: strings.devNotes.notFound },
      { status: 404 },
    );
  }

  const [deletedUpdate] = await db
    .delete(devUpdates)
    .where(eq(devUpdates.id, id))
    .returning({ id: devUpdates.id });

  if (!deletedUpdate) {
    return NextResponse.json(
      { error: strings.devNotes.notFound },
      { status: 404 },
    );
  }

  return NextResponse.json({ id: deletedUpdate.id });
}
