import { createAdminClient } from '@/lib/supabase/admin';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { Mood } from '@/lib/types';

const MOODS: Mood[] = ['great', 'good', 'neutral', 'bad', 'terrible'];

function htmlPage(title: string, icon: string, message: string) {
  return new Response(
    `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:400px;margin:80px auto;padding:20px;text-align:center;background:#fafafa}.card{background:white;border-radius:20px;padding:40px 32px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}.icon{font-size:64px;margin-bottom:20px}.title{font-size:22px;font-weight:600;color:#111;margin-bottom:8px}.msg{font-size:15px;color:#666}</style></head><body><div class="card"><div class="icon">${icon}</div><div class="title">${title}</div><div class="msg">${message}</div></div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const content = searchParams.get('c') ?? '';
  const date = searchParams.get('d') ?? '';
  const mood = (searchParams.get('m') ?? 'neutral') as Mood;
  const key = searchParams.get('k') ?? '';

  if (key !== (process.env.ENTRIES_API_KEY ?? '').trim()) {
    return htmlPage('Brak dostępu', '🔒', 'Nieprawidłowy klucz autoryzacji.');
  }
  if (!content) {
    return htmlPage('Błąd', '⚠️', 'Brak treści wpisu.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return htmlPage('Błąd', '⚠️', 'Nieprawidłowy format daty.');
  }
  if (!MOODS.includes(mood)) {
    return htmlPage('Błąd', '⚠️', 'Nieprawidłowy nastrój.');
  }

  const supabase = createAdminClient();
  const htmlContent = `<p>${content.replace(/\n+/g, '</p><p>')}</p>`;
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('entries')
    .select('id, content')
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('entries')
      .update({ content: existing.content + htmlContent, mood, updated_at: now })
      .eq('id', existing.id);
    if (error) return htmlPage('Błąd', '❌', error.message);
    return htmlPage('Zapisano!', '✅', 'Wpis zaktualizowany — możesz zamknąć tę kartę.');
  }

  const { data: anyEntry } = await supabase.from('entries').select('user_id').limit(1).maybeSingle();
  let userId: string;
  if (anyEntry?.user_id) {
    userId = anyEntry.user_id;
  } else {
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr || !authUsers?.users.length) {
      return htmlPage('Błąd', '❌', 'Nie znaleziono konta użytkownika.');
    }
    userId = authUsers.users[0].id;
  }

  const { error } = await supabase.from('entries').insert({
    id: uuidv4(),
    date,
    title: '',
    content: htmlContent,
    mood,
    created_at: now,
    updated_at: now,
    user_id: userId,
  });
  if (error) return htmlPage('Błąd', '❌', error.message);
  return htmlPage('Zapisano!', '✅', 'Wpis dodany — możesz zamknąć tę kartę.');
}
