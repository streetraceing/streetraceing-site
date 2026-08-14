import { randomBytes } from 'node:crypto';

export * from '@/utils/tiny-url';

export function createShortCode() {
  return randomBytes(6).toString('base64url');
}

export function createOwnerToken() {
  return randomBytes(24).toString('base64url');
}
