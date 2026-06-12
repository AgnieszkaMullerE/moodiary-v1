import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

async function getSessionUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `dzn_${hex}`;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('api_tokens')
    .select('id, name, created_at, last_used_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let name = 'default';
  try {
    const body = await request.json();
    if (body.name && typeof body.name === 'string') name = body.name.trim().slice(0, 60) || 'default';
  } catch { /* no body or invalid JSON — use default name */ }

  const token = generateToken();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('api_tokens')
    .insert({ user_id: user.id, name, token })
    .select('id, name, token, created_at')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from('api_tokens')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!count) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
