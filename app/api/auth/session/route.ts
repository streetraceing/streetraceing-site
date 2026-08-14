import { noStoreJson } from '@/lib/api-response';
import { isAdmin, isAuthConfigured } from '@/utils/auth';

export async function GET() {
  return noStoreJson({
    authenticated: await isAdmin(),
    configured: isAuthConfigured(),
  });
}
