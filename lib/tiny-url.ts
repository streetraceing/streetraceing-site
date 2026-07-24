import { randomBytes } from 'node:crypto';

export const CODE_PATTERN = /^[A-Za-z0-9_-]{8}$/;
export const OWNER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
export const MAX_CONTENT_LENGTH = 20_000;
export const MAX_OWNER_ITEMS = 100;
export const TINY_URL_PREVIEW_LENGTH = 160;
export const TINY_URL_RETENTION_DAYS = 30;
export const TINY_URL_OWNER_COOKIE = 'tiny-url-owner';

export function createShortCode() {
  return randomBytes(6).toString('base64url');
}

export function createOwnerToken() {
  return randomBytes(24).toString('base64url');
}

export function getTinyUrlExpirationDate(createdAt: Date) {
  return new Date(
    createdAt.getTime() + TINY_URL_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
  );
}

export function getTinyUrlRetentionThreshold(now = new Date()) {
  return new Date(
    now.getTime() - TINY_URL_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
  );
}

export function isTinyUrlExpired(createdAt: Date, now = new Date()) {
  return createdAt.getTime() <= getTinyUrlRetentionThreshold(now).getTime();
}

export function createTinyUrlPreview(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();

  return normalized.length > TINY_URL_PREVIEW_LENGTH
    ? `${normalized.slice(0, TINY_URL_PREVIEW_LENGTH)}…`
    : normalized;
}
