import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTempChatContentDisposition,
  buildTempChatFileKey,
  formatTempChatFileSize,
  getTempChatExpirationDate,
  isTempChatAuthorNameValid,
  isTempChatFileKey,
  isTempChatTtlHours,
  normalizeTempChatAuthorName,
  sanitizeTempChatFileName,
} from '../utils/temp-chat';

test('validates temp chat TTL values', () => {
  assert.equal(isTempChatTtlHours(1), true);
  assert.equal(isTempChatTtlHours(168), true);
  assert.equal(isTempChatTtlHours(2), false);
  assert.equal(isTempChatTtlHours('24'), false);
  assert.equal(isTempChatTtlHours(null), false);
});

test('normalizes author names', () => {
  assert.equal(
    normalizeTempChatAuthorName('  Андрей   Иванов '),
    'Андрей Иванов',
  );
  assert.equal(isTempChatAuthorNameValid('A'), true);
  assert.equal(isTempChatAuthorNameValid('   '), false);
  assert.equal(isTempChatAuthorNameValid('x'.repeat(41)), false);
});

test('builds and validates chat file keys', () => {
  const chatId = '0b7b8f78-0f2e-4d1f-9c9d-a0cf3f4f6f01';
  const key = buildTempChatFileKey(chatId, 'abc123');

  assert.equal(key, `temp-chat/${chatId}/abc123`);
  assert.equal(isTempChatFileKey(chatId, key), true);
  assert.equal(isTempChatFileKey(chatId, 'temp-chat/other-chat/abc123'), false);
  assert.equal(isTempChatFileKey(chatId, `temp-chat/${chatId}/`), false);
  assert.equal(isTempChatFileKey(chatId, 42), false);
});

test('sanitizes client file names', () => {
  assert.equal(sanitizeTempChatFileName('../../secret.txt'), 'secret.txt');
  assert.equal(
    sanitizeTempChatFileName('report: final?.pdf'),
    'report_ final_.pdf',
  );
  assert.equal(sanitizeTempChatFileName('   '), 'file');
  assert.equal(sanitizeTempChatFileName('...'), 'file');
  assert.equal(sanitizeTempChatFileName(`${'a'.repeat(300)}.txt`).length, 200);
});

test('builds ascii-safe content disposition headers', () => {
  assert.equal(
    buildTempChatContentDisposition('report.pdf'),
    'attachment; filename="report.pdf"',
  );
  assert.equal(
    buildTempChatContentDisposition('отчёт.pdf'),
    'attachment; filename="_____.pdf"',
  );
});

test('formats file sizes for display', () => {
  assert.equal(formatTempChatFileSize(512, 'en-US'), '512 B');
  assert.equal(formatTempChatFileSize(2_048, 'en-US'), '2 KB');
  assert.equal(formatTempChatFileSize(5 * 1_024 * 1_024, 'en-US'), '5 MB');
  assert.equal(formatTempChatFileSize(-1, 'en-US'), '');
});

test('computes chat expiration from TTL hours', () => {
  const createdAt = new Date('2026-09-12T12:00:00.000Z');

  assert.equal(
    getTempChatExpirationDate(createdAt, 1).toISOString(),
    '2026-09-12T13:00:00.000Z',
  );
  assert.equal(
    getTempChatExpirationDate(createdAt, 168).toISOString(),
    '2026-09-19T12:00:00.000Z',
  );
});
