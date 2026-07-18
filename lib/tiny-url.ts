import { randomBytes } from 'crypto';

export const CODE_PATTERN = /^[A-Za-z0-9_-]{8}$/;
export const MAX_CONTENT_LENGTH = 100_000;
export const TINY_URL_OWNER_COOKIE = 'tiny-url-owner';

export function createShortCode() {
  return randomBytes(6).toString('base64url');
}

export function createOwnerToken() {
  return randomBytes(24).toString('base64url');
}
