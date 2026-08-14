import { noStoreJson } from '@/lib/api-response';
import { adminSessionCookie } from '@/utils/auth';

export async function POST() {
  const response = noStoreJson({ authenticated: false });
  response.cookies.set(adminSessionCookie.name, '', {
    ...adminSessionCookie.options,
    maxAge: 0,
  });

  return response;
}
