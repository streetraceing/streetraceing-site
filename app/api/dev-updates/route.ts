import { asc, count, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { devUpdates } from '@/db/schema';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import { parsePositiveInteger } from '@/utils/numbers';
import {
  DEV_UPDATES_PAGE_SIZE,
  isDevUpdateSort,
  isDevUpdateTopic,
} from '@/utils/stats';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parsePositiveInteger(searchParams.get('page'), 1, 10_000);
  const topicValue = searchParams.get('topic');
  const topic =
    topicValue && isDevUpdateTopic(topicValue) ? topicValue : undefined;
  const sortValue = searchParams.get('sort');
  const sort = sortValue && isDevUpdateSort(sortValue) ? sortValue : 'newest';
  const where = topic ? eq(devUpdates.topic, topic) : undefined;
  const orderBy =
    sort === 'oldest' ? asc(devUpdates.createdAt) : desc(devUpdates.createdAt);

  const [totalResult, updates] = await Promise.all([
    db.select({ total: count() }).from(devUpdates).where(where),
    db
      .select()
      .from(devUpdates)
      .where(where)
      .orderBy(orderBy)
      .limit(DEV_UPDATES_PAGE_SIZE)
      .offset((page - 1) * DEV_UPDATES_PAGE_SIZE),
  ]);

  const total = totalResult[0]?.total ?? 0;

  return NextResponse.json({
    updates,
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / DEV_UPDATES_PAGE_SIZE)),
    },
  });
}

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const strings = translations[locale].api;

  if (!(await isAdmin())) {
    return NextResponse.json({ error: strings.auth.required }, { status: 401 });
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
    .insert(devUpdates)
    .values({
      title: title || null,
      content,
      topic,
    })
    .returning();

  return NextResponse.json({ update }, { status: 201 });
}
