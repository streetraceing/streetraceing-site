export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getJsonError(value: unknown) {
  return isJsonObject(value) && typeof value.error === 'string'
    ? value.error
    : undefined;
}

export async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}
