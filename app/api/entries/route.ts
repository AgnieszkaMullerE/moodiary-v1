import { createAdminClient } from '@/lib/supabase/admin';
import { checkApiAuth } from '@/lib/api-auth';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { Mood } from '@/lib/types';

const MOOD_FROM_SCORE: Record<number, Mood> = {
  1: 'terrible',
  2: 'bad',
  3: 'neutral',
  4: 'good',
  5: 'great',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const MOOD_SYSTEM_PROMPT = `Jesteś asystentem analizującym nastrój wpisu w dzienniku osobistym.
Na podstawie treści wpisu wybierz DOKŁADNIE JEDNO słowo z poniższej listy:

great  — ekscytacja, wielka radość, euforia, duży sukces, bardzo pozytywne emocje
good   — zadowolenie, spokojne szczęście, pozytywny dzień, rzeczy szły dobrze
neutral — normalny dzień, mieszane uczucia, relacjonowanie faktów, ani dobry ani zły
bad    — smutek, frustracja, zmęczenie, stres, niepokój, rozczarowanie
terrible — głęboki smutek, kryzys, rozpacz, płakanie, bardzo trudne przeżycia

Odpowiedz TYLKO jednym słowem z listy. Żadnych dodatkowych komentarzy.`;

function inferMoodLocally(text: string): Mood {
  const t = text.toLowerCase();
  if (/świetnie|super|fantastycznie|doskonale|rewelacyjnie|ekscytuj|wspaniałe|cudowne|niesamowit|sukces|udało|wygrał|najlepszy dzień/.test(t)) return 'great';
  if (/strasznie|okropnie|koszmarnie|tragicznie|płakał|płakała|beznadziejnie|kryzys|desperacja|beznadzieja|nie mogę już/.test(t)) return 'terrible';
  if (/źle|smutno|zmęczon|frustruj|zdenerwow|stres|przygnębi|niepokój|ciężki dzień|zły dzień/.test(t)) return 'bad';
  if (/dobrze|miło|fajnie|przyjemnie|pozytywnie|zadowolona|zadowolony|całkiem niezłe|całkiem dobrze/.test(t)) return 'good';
  return 'neutral';
}

async function inferMoodWithAI(content: string): Promise<Mood> {
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        max_tokens: 10,
        messages: [
          { role: 'system', content: MOOD_SYSTEM_PROMPT },
          { role: 'user', content },
        ],
      }),
    });
    if (!response.ok) return inferMoodLocally(content);
    const data = await response.json();
    const raw = data.choices[0].message.content.trim().toLowerCase() as Mood;
    return (['great', 'good', 'neutral', 'bad', 'terrible'] as Mood[]).includes(raw)
      ? raw
      : inferMoodLocally(content);
  } catch {
    return inferMoodLocally(content);
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkApiAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  }

  let body: { content?: string; date?: string; mood?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nieprawidłowy JSON' }, { status: 400, headers: CORS_HEADERS });
  }

  const content = body.content?.trim();
  if (!content) {
    return Response.json({ error: 'Pole content jest wymagane' }, { status: 400, headers: CORS_HEADERS });
  }

  const entryDate = body.date ?? new Date().toISOString().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return Response.json({ error: 'Nieprawidłowy format daty. Użyj YYYY-MM-DD' }, { status: 400, headers: CORS_HEADERS });
  }

  let mood: Mood;
  if (body.mood !== undefined) {
    const score = body.mood;
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return Response.json({ error: 'Pole mood musi być liczbą całkowitą od 1 do 5' }, { status: 400, headers: CORS_HEADERS });
    }
    mood = MOOD_FROM_SCORE[score];
  } else {
    mood = await inferMoodWithAI(content);
  }

  const supabase = createAdminClient();

  // Szukamy po samej dacie (aplikacja jednego użytkownika)
  const { data: existing } = await supabase
    .from('entries')
    .select('id, content, user_id')
    .eq('date', entryDate)
    .maybeSingle();

  const htmlContent = `<p>${content.replace(/\n+/g, '</p><p>')}</p>`;
  const now = new Date().toISOString();

  if (existing) {
    const { error } = await supabase
      .from('entries')
      .update({ content: existing.content + htmlContent, mood, updated_at: now })
      .eq('id', existing.id);
    if (error) return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
    return Response.json({ ok: true, action: 'updated', date: entryDate, mood }, { headers: CORS_HEADERS });
  }

  // Nowy wpis — pobierz user_id z istniejących wpisów lub z auth
  const { data: anyEntry } = await supabase
    .from('entries')
    .select('user_id')
    .limit(1)
    .maybeSingle();

  let userId: string;
  if (anyEntry?.user_id) {
    userId = anyEntry.user_id;
  } else {
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr || !authUsers.users.length) {
      return Response.json({ error: 'Nie znaleziono użytkownika' }, { status: 500, headers: CORS_HEADERS });
    }
    userId = authUsers.users[0].id;
  }

  const { error } = await supabase.from('entries').insert({
    id: uuidv4(),
    date: entryDate,
    title: '',
    content: htmlContent,
    mood,
    created_at: now,
    updated_at: now,
    user_id: userId,
  });
  if (error) return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });

  return Response.json({ ok: true, action: 'created', date: entryDate, mood }, { headers: CORS_HEADERS });
}
