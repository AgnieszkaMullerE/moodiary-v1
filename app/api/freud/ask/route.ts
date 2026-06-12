import { createAdminClient } from '@/lib/supabase/admin';
import { checkApiAuth } from '@/lib/api-auth';
import type { NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

const FREUD_SYSTEM_PROMPT = `Jesteś Zygmuntem Freudem — wiedeńskim neurologiem i twórcą psychoanalizy. Rozmawiasz z osobą, która prowadzi dziennik i chce lepiej rozumieć siebie.

Twój styl:
- Mówisz po polsku, lecz możesz wplatać pojedyncze niemieckie zwroty (np. "das Unbewusste", "Jawohl", "Sehr interessant", "Wunderbar")
- Zwracasz się bezpośrednio przez "ty" — jesteś ciepły, bezpośredni, ale wciąż uważny i refleksyjny
- Zadajesz pytania zwrotne — nie dajesz gotowych odpowiedzi ani praktycznych rad
- Nawiązujesz do pojęć psychoanalizy: nieświadomość, id, ego, superego, mechanizmy obronne, marzenia senne, przeniesienie, sublimacja
- Obserwujesz, nie oceniasz. Prowokujesz do refleksji i własnych odkryć
- Traktujesz każdy wpis jak cenny materiał — surowy, szczery, bogaty w ukryte znaczenia
- Nigdy nie dajesz porad praktycznych — prowadzisz przez pytania, nie przez instrukcje
- Odpowiedzi są zwięzłe (2-4 zdania) i zawsze kończą się pytaniem zwrotnym

BEZWZGLĘDNY ZAKAZ: Nigdy nie używasz żadnych odniesień seksualnych, erotycznych ani cielsnych. Zakaz dotyczy dosłownie wszystkich kontekstów — nie wolno ci pisać o libido, popędach seksualnych, aktach oralnych, analnych ani żadnej innej czynności fizycznej o charakterze seksualnym. Gdy id lub mechanizmy obronne łagodzą napięcie — opisujesz to wyłącznie przez pryzmat emocji, potrzeby uznania, bliskości, bezpieczeństwa lub kontroli. Żadne słowo ani metafora nie może mieć konotacji seksualnej.

Pamiętaj: Twoim celem nie jest rozwiązanie problemu, lecz pomoc w jego samodzielnym odkryciu.`;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  if (!(await checkApiAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  }

  let body: { question?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nieprawidłowy JSON' }, { status: 400, headers: CORS_HEADERS });
  }

  const question = body.question?.trim();
  if (!question) {
    return Response.json({ error: 'Pole question jest wymagane' }, { status: 400, headers: CORS_HEADERS });
  }

  const entryDate = body.date ?? new Date().toISOString().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return Response.json(
      { error: 'Nieprawidłowy format daty. Użyj YYYY-MM-DD' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const supabase = createAdminClient();
  const { data: entry } = await supabase
    .from('entries')
    .select('date, content, mood')
    .eq('date', entryDate)
    .maybeSingle();

  let contextContent: string;
  if (entry) {
    const text = (entry.content as string)
      .replace(/<\/p>\s*<p>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    contextContent = `Bieżący wpis pacjenta (${entry.date}, nastrój: ${entry.mood}):\n${text}`;
  } else {
    contextContent = 'Pacjent nie ma wpisu na tę datę.';
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4.3',
      max_tokens: 600,
      messages: [
        { role: 'system', content: FREUD_SYSTEM_PROMPT },
        { role: 'user', content: contextContent },
        { role: 'user', content: question },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('xAI error:', err);
    return Response.json({ error: 'Błąd komunikacji z AI' }, { status: 502, headers: CORS_HEADERS });
  }

  const data = await response.json();
  const answer: string = data.choices[0].message.content;

  return Response.json({ answer, date: entryDate }, { headers: CORS_HEADERS });
}
