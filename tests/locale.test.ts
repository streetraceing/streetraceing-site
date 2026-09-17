import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defaultLocale,
  getLocale,
  getLocaleFromAcceptLanguage,
  getLocaleTag,
  getRequestLocale,
  LOCALE_COOKIE,
  translations,
} from '../utils/i18n';

const requestUrl = 'https://example.test/api/auth/session';

test('locale negotiation uses quality weights rather than header order', () => {
  assert.equal(getLocaleFromAcceptLanguage('ru;q=0.2,en;q=0.9'), 'en');
  assert.equal(getLocaleFromAcceptLanguage('en;q=0.2,ru;q=0.9'), 'ru');
  assert.equal(getLocaleFromAcceptLanguage('ru;q=0.999,en'), 'en');
  assert.equal(getLocaleFromAcceptLanguage('fr;q=1,en;q=0.8,ru;q=0.1'), 'en');
});

test('locale negotiation preserves header order for equal quality values', () => {
  assert.equal(getLocaleFromAcceptLanguage('en;q=0.8,ru;q=0.8'), 'en');
  assert.equal(getLocaleFromAcceptLanguage('ru;q=0.8,en;q=0.8'), 'ru');
  assert.equal(getLocaleFromAcceptLanguage('en,ru'), 'en');
  assert.equal(getLocaleFromAcceptLanguage('ru,en'), 'ru');
  assert.equal(getLocaleFromAcceptLanguage('en-GB;q=1.000,ru;q=1'), 'en');
});

test('locale negotiation accepts region tags, case, and whitespace', () => {
  assert.equal(
    getLocaleFromAcceptLanguage(' EN-us ; Q=0.9 , RU-ru;q=0.3 '),
    'en',
  );
  assert.equal(getLocaleFromAcceptLanguage('ru-RU,en-US;q=0.5'), 'ru');
  assert.equal(getLocaleFromAcceptLanguage('enough,run,en;q=0.5'), 'en');
});

test('zero quality locales are excluded while another locale is available', () => {
  assert.equal(getLocaleFromAcceptLanguage('en;q=0,ru;q=0.1'), 'ru');
  assert.equal(getLocaleFromAcceptLanguage('ru;q=0.000,en;q=0.001'), 'en');
  assert.equal(getLocaleFromAcceptLanguage('ru;q=0'), 'en');
  assert.equal(getLocaleFromAcceptLanguage('en;q=0'), 'ru');
  assert.equal(getLocaleFromAcceptLanguage('ru-RU;q=0,fr;q=1'), 'en');
});

test('wildcards respect explicit exclusions and weighted preferences', () => {
  assert.equal(getLocaleFromAcceptLanguage('*;q=0.5'), defaultLocale);
  assert.equal(getLocaleFromAcceptLanguage('ru;q=0,*;q=1'), 'en');
  assert.equal(getLocaleFromAcceptLanguage('en;q=0,*;q=1'), 'ru');
  assert.equal(getLocaleFromAcceptLanguage('en;q=0.4,*;q=0.8'), 'ru');
  assert.equal(getLocaleFromAcceptLanguage('*;q=0,en;q=0.1'), 'en');
  assert.equal(getLocaleFromAcceptLanguage('en;q=0.8,*;q=0.8'), 'en');
});

test('invalid quality values do not outrank a valid preference', () => {
  for (const quality of [
    '',
    'NaN',
    'Infinity',
    '-1',
    '2',
    '1.1',
    '0.1234',
    '0.8x',
    '.8',
    '1=0',
  ]) {
    assert.equal(
      getLocaleFromAcceptLanguage(`en;q=${quality},ru;q=0.1`),
      'ru',
      quality,
    );
    assert.equal(
      getLocaleFromAcceptLanguage(`ru;q=${quality},en;q=0.1`),
      'en',
      quality,
    );
  }
  assert.equal(getLocaleFromAcceptLanguage('en;q=0.9;q=0,ru;q=0.1'), 'ru');
  assert.equal(getLocaleFromAcceptLanguage('en;q,ru;q=0.1'), 'ru');
});

test('duplicate ranges use their highest weight and retain stable ties', () => {
  assert.equal(getLocaleFromAcceptLanguage('en;q=0.1,ru;q=0.5,en;q=0.9'), 'en');
  assert.equal(getLocaleFromAcceptLanguage('en;q=0.1,ru;q=0.5,en;q=0.5'), 'ru');
});

test('missing or unsupported preferences use the site fallback', () => {
  for (const value of [null, '', ' ', 'fr,de;q=0.5', ',,,']) {
    assert.equal(getLocaleFromAcceptLanguage(value), defaultLocale);
  }
});

test('when every supported locale is rejected the site still has a fallback', () => {
  assert.equal(getLocaleFromAcceptLanguage('ru;q=0,en;q=0'), defaultLocale);
  assert.equal(getLocaleFromAcceptLanguage('*;q=0'), defaultLocale);
});

test('an explicit locale cookie takes precedence over weighted headers', () => {
  for (const locale of ['ru', 'en'] as const) {
    const request = new Request(requestUrl, {
      headers: {
        cookie: `other=value; ${LOCALE_COOKIE}=${locale}; last=value`,
        'accept-language': locale === 'ru' ? 'en;q=1,ru;q=0' : 'ru;q=1,en;q=0',
      },
    });
    assert.equal(getRequestLocale(request), locale);
  }
});

test('request locale uses weighted headers when no locale cookie exists', () => {
  const request = new Request(requestUrl, {
    headers: {
      cookie: `not_${LOCALE_COOKIE}=ru; other=value`,
      'accept-language': 'ru;q=0.1,en;q=0.9',
    },
  });
  assert.equal(getRequestLocale(request), 'en');
  assert.equal(getRequestLocale(new Request(requestUrl)), defaultLocale);
});

test('locale helpers retain supported tags and safe cookie fallbacks', () => {
  assert.equal(getLocale('en'), 'en');
  assert.equal(getLocale('ru'), 'ru');
  assert.equal(getLocale('unknown'), defaultLocale);
  assert.equal(getLocale(undefined), defaultLocale);
  assert.equal(getLocaleTag('ru'), 'ru-RU');
  assert.equal(getLocaleTag('en'), 'en-US');
});

test('navigation and logout messages have matching nonempty locale keys', () => {
  for (const key of [
    'skipToContent',
    'logoutPending',
    'logoutFailed',
    'dismissError',
  ] as const) {
    assert.ok(translations.ru.header[key].trim());
    assert.ok(translations.en.header[key].trim());
    assert.notEqual(translations.ru.header[key], translations.en.header[key]);
  }
  assert.equal(translations.ru.footer.slogan, translations.en.footer.slogan);
});
