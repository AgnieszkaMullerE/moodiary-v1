import { createAdminClient } from '@/lib/supabase/admin';

export async function checkApiAuth(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  const expected = (process.env.ENTRIES_API_KEY ?? '').trim();

  if (auth === `Bearer ${expected}` || apiKey === expected) return true;

  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : (apiKey ?? null);
  if (!token || !token.startsWith('dzn_')) return false;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('api_tokens')
    .select('id')
    .eq('token', token)
    .maybeSingle();

  if (!data) return false;

  supabase
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {});

  return true;
}
