export { isJsonObject } from '@/utils/json';

export type JsonBodyReadResult =
  { ok: true; value: unknown } | { ok: false; reason: 'invalid' | 'too-large' };

type BoundedBytesResult =
  | { ok: true; value: Uint8Array }
  | { ok: false; reason: 'invalid' | 'too-large' };

function validateMaximumBytes(maximumBytes: number) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new RangeError('maximumBytes must be a positive safe integer.');
  }
}

async function readBoundedStream(
  stream: ReadableStream<Uint8Array>,
  maximumBytes: number,
): Promise<BoundedBytesResult> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maximumBytes) {
        await reader.cancel();
        return { ok: false, reason: 'too-large' };
      }

      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: 'invalid' };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, value: bytes };
}

function readDeclaredContentLength(message: { headers: Headers }) {
  const value = message.headers.get('content-length');

  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export async function readJsonBody(
  request: Request,
  maximumBytes: number,
): Promise<JsonBodyReadResult> {
  validateMaximumBytes(maximumBytes);

  const declaredLength = readDeclaredContentLength(request);

  if (declaredLength !== undefined && declaredLength > maximumBytes) {
    return { ok: false, reason: 'too-large' };
  }

  if (!request.body) {
    return { ok: false, reason: 'invalid' };
  }

  const bodyResult = await readBoundedStream(request.body, maximumBytes);

  if (!bodyResult.ok) {
    return bodyResult;
  }

  try {
    const source = new TextDecoder('utf-8', { fatal: true }).decode(
      bodyResult.value,
    );
    return { ok: true, value: JSON.parse(source) as unknown };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export async function readBoundedResponseText(
  response: Response,
  maximumBytes: number,
) {
  validateMaximumBytes(maximumBytes);

  const declaredLength = readDeclaredContentLength(response);

  if (
    (declaredLength !== undefined && declaredLength > maximumBytes) ||
    !response.body
  ) {
    return undefined;
  }

  const bodyResult = await readBoundedStream(response.body, maximumBytes);

  if (!bodyResult.ok) {
    return undefined;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bodyResult.value);
  } catch {
    return undefined;
  }
}
