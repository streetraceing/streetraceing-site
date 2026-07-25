import { cookies, headers } from 'next/headers';

import {
  getLocale,
  getLocaleFromAcceptLanguage,
  LOCALE_COOKIE,
  type Locale,
} from '@/utils/i18n';

export async function getServerLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const storedLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  return storedLocale
    ? getLocale(storedLocale)
    : getLocaleFromAcceptLanguage(headerStore.get('accept-language'));
}
