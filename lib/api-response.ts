import { NextResponse } from 'next/server';

export function noStoreJson(
  body: unknown,
  init?: ResponseInit,
  additionalHeaders?: HeadersInit,
) {
  const response = NextResponse.json(body, init);

  if (additionalHeaders) {
    const headers = new Headers(additionalHeaders);
    headers.forEach((value, name) => response.headers.set(name, value));
  }

  response.headers.set('Cache-Control', 'no-store');
  return response;
}
