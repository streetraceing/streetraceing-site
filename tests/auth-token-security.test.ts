import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test, { type TestContext } from 'node:test';

import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '../utils/auth';
import {
  createTempChatMemberToken,
  verifyTempChatMemberToken,
} from '../lib/temp-chat';

const SECRET = 'test-only-secret-with-at-least-thirty-two-characters';
const NOW = 1_789_387_200;
const CHAT_ID = '0b7b8f78-0f2e-4d1f-9c9d-a0cf3f4f6f01';
const MEMBER_ID = 'a'.repeat(22);
const ADMIN_CONTEXT = 'streetraceing:admin-session:v1\0';
const MEMBER_CONTEXT = 'streetraceing:temp-chat-member:v1\0';
const adminClaims = {
  purpose: 'admin-session',
  version: 1,
  iat: NOW,
  exp: NOW + 60,
};
const memberClaims = {
  purpose: 'temp-chat-member',
  version: 1,
  iat: NOW,
  exp: NOW + 60,
  chatId: CHAT_ID,
  memberId: MEMBER_ID,
  name: 'Test member',
};

function setup(context: TestContext) {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = `  ${SECRET}  `;
  context.mock.method(Date, 'now', () => NOW * 1_000);
  context.after(() => {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  });
}

function sign(claims: unknown, context: string) {
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${encoded}.${createHmac('sha256', SECRET).update(context).update(encoded).digest('base64url')}`;
}

test('admin and membership signatures cannot cross purposes, even with replaced claims', (t) => {
  setup(t);
  const admin = createAdminSessionToken();
  const member = createTempChatMemberToken(
    CHAT_ID,
    MEMBER_ID,
    'Test member',
    new Date((NOW + 60) * 1_000),
  );
  assert.ok(admin);
  assert.ok(member);
  assert.equal(verifyAdminSessionToken(admin), true);
  assert.deepEqual(verifyTempChatMemberToken(member, CHAT_ID), {
    memberId: MEMBER_ID,
    name: 'Test member',
  });
  assert.equal(verifyAdminSessionToken(member), false);
  assert.equal(verifyTempChatMemberToken(admin, CHAT_ID), undefined);
  assert.equal(
    verifyAdminSessionToken(sign(adminClaims, MEMBER_CONTEXT)),
    false,
  );
  assert.equal(
    verifyTempChatMemberToken(sign(memberClaims, ADMIN_CONTEXT), CHAT_ID),
    undefined,
  );
  assert.equal(
    verifyTempChatMemberToken(member, '0b7b8f78-0f2e-4d1f-9c9d-a0cf3f4f6f02'),
    undefined,
  );
});

test('legacy raw HMAC tokens are deliberately invalidated', (t) => {
  setup(t);
  for (const claims of [{ exp: NOW + 60 }, memberClaims, adminClaims]) {
    const legacy = sign(claims, '');
    assert.equal(verifyAdminSessionToken(legacy), false);
    assert.equal(verifyTempChatMemberToken(legacy, CHAT_ID), undefined);
  }
});

test('admin claims must have the exact bounded versioned shape', (t) => {
  setup(t);
  const invalid: unknown[] = [
    null,
    [],
    true,
    42,
    'admin',
    {},
    { exp: NOW + 60 },
    { ...adminClaims, purpose: 'temp-chat-member' },
    { ...adminClaims, version: '1' },
    { ...adminClaims, version: 2 },
    { ...adminClaims, exp: String(NOW + 60) },
    { ...adminClaims, exp: NOW + 0.5 },
    { ...adminClaims, exp: null },
    { ...adminClaims, iat: -1 },
    { ...adminClaims, iat: NOW + 1 },
    { ...adminClaims, iat: NOW + 0.5 },
    { ...adminClaims, exp: NOW + 604_801 },
    { ...adminClaims, exp: Number.MAX_SAFE_INTEGER + 1 },
    { ...adminClaims, extra: true },
  ];
  for (const claims of invalid) {
    assert.equal(verifyAdminSessionToken(sign(claims, ADMIN_CONTEXT)), false);
  }
});

test('membership claims reject malformed identifiers, names, expiry and extra claims', (t) => {
  setup(t);
  const invalid: unknown[] = [
    null,
    [],
    {},
    { ...memberClaims, purpose: 'admin-session' },
    { ...memberClaims, version: 2 },
    { ...memberClaims, version: '1' },
    { ...memberClaims, chatId: 'not-a-uuid' },
    { ...memberClaims, chatId: 42 },
    { ...memberClaims, memberId: 123 },
    { ...memberClaims, memberId: 'a'.repeat(23) },
    { ...memberClaims, name: null },
    { ...memberClaims, name: ['Test'] },
    { ...memberClaims, name: 'x'.repeat(41) },
    { ...memberClaims, name: ' ' },
    { ...memberClaims, name: ' Test ' },
    { ...memberClaims, name: 'Test\u0000' },
    { ...memberClaims, exp: String(NOW + 60) },
    { ...memberClaims, exp: NOW + 0.5 },
    { ...memberClaims, iat: -1 },
    { ...memberClaims, iat: NOW + 1 },
    { ...memberClaims, exp: NOW + 604_801 },
    { ...memberClaims, exp: Number.MAX_SAFE_INTEGER + 1 },
    { ...memberClaims, extra: true },
  ];
  for (const claims of invalid) {
    assert.equal(
      verifyTempChatMemberToken(sign(claims, MEMBER_CONTEXT), CHAT_ID),
      undefined,
    );
  }
});

test('expiry boundaries, signature tampering and malformed encodings fail closed', (t) => {
  setup(t);
  for (const exp of [NOW - 1, NOW]) {
    assert.equal(
      verifyAdminSessionToken(sign({ ...adminClaims, exp }, ADMIN_CONTEXT)),
      false,
    );
    assert.equal(
      verifyTempChatMemberToken(
        sign({ ...memberClaims, exp }, MEMBER_CONTEXT),
        CHAT_ID,
      ),
      undefined,
    );
  }
  for (const [claims, context] of [
    [adminClaims, ADMIN_CONTEXT],
    [memberClaims, MEMBER_CONTEXT],
  ] as const) {
    const valid = sign(claims, context);
    const [payload, signature] = valid.split('.');
    const changed = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
    for (const token of [
      `${payload}.${changed}`,
      `${payload}=.${signature}`,
      `${valid}.extra`,
      `${payload}.`,
      `.${signature}`,
      'a'.repeat(2_000),
      '',
    ]) {
      assert.equal(verifyAdminSessionToken(token), false);
      assert.equal(verifyTempChatMemberToken(token, CHAT_ID), undefined);
    }
  }
  assert.equal(verifyAdminSessionToken(undefined), false);
  assert.equal(verifyTempChatMemberToken(undefined, CHAT_ID), undefined);
});

test('issuers reject invalid input and apply identical trimmed secret bounds', (t) => {
  setup(t);
  const expiresAt = new Date((NOW + 60) * 1_000);
  assert.equal(
    createTempChatMemberToken('bad-id', MEMBER_ID, 'Test', expiresAt),
    undefined,
  );
  assert.equal(
    createTempChatMemberToken(CHAT_ID, MEMBER_ID, 'x'.repeat(41), expiresAt),
    undefined,
  );
  assert.equal(
    createTempChatMemberToken(CHAT_ID, MEMBER_ID, 'Test', new Date(NaN)),
    undefined,
  );
  const admin = createAdminSessionToken();
  const member = createTempChatMemberToken(
    CHAT_ID,
    MEMBER_ID,
    'Test',
    expiresAt,
  );
  process.env.AUTH_SECRET = SECRET;
  assert.equal(verifyAdminSessionToken(admin), true);
  assert.ok(verifyTempChatMemberToken(member, CHAT_ID));
  for (const secret of [
    '',
    ' '.repeat(32),
    ` ${'a'.repeat(31)} `,
    'a'.repeat(4_097),
  ]) {
    process.env.AUTH_SECRET = secret;
    assert.equal(createAdminSessionToken(), undefined);
    assert.equal(
      createTempChatMemberToken(CHAT_ID, MEMBER_ID, 'Test', expiresAt),
      undefined,
    );
    assert.equal(verifyAdminSessionToken(admin), false);
    assert.equal(verifyTempChatMemberToken(member, CHAT_ID), undefined);
  }
});
