import { createAdminClient } from '@/lib/supabase/admin';
import { checkApiAuth } from '@/lib/api-auth';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { Mood } from '@/lib/types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
};

// ── MCP tool definitions ───────────────────────────────────────────────────

export const TOOLS = [
  {
    name: 'add_entry',
    description:
      'Add or append a journal entry for a specific date. If an entry already exists for that date, the new content is appended to it. Mood is auto-inferred by AI if not provided.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Journal entry text (plain text).' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today.' },
        mood: {
          type: 'number',
          description: 'Mood score 1–5: 1=terrible, 2=bad, 3=neutral, 4=good, 5=great. If omitted, mood is auto-inferred from content.',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'ask_freud',
    description:
      "Ask Dr. Sigmund Freud a psychoanalytic question with the journal entry of a given date as context. Returns a response in Polish. If no entry exists for that date, Freud answers without context.",
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to ask Dr. Freud.' },
        date: { type: 'string', description: "Date in YYYY-MM-DD format to use as context. Defaults to today." },
      },
      required: ['question'],
    },
  },
  {
    name: 'get_entry',
    description: 'Retrieve the journal entry for a specific date, including its plain-text content and mood.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (e.g. 2026-06-12).' },
      },
      required: ['date'],
    },
  },
];

// ── Shared helpers ─────────────────────────────────────────────────────────

const MOOD_FROM_SCORE: Record<number, Mood> = {
  1: 'terrible', 2: 'bad', 3: 'neutral', 4: 'good', 5: 'great',
};
const MOOD_TO_SCORE: Record<string, number> = {
  terrible: 1, bad: 2, neutral: 3, good: 4, great: 5,
};

function stripHtml(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
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
  if (/świetnie|super|fantastycznie|doskonale|sukces|udało|wygrał|najlepszy dzień/.test(t)) return 'great';
  if (/strasznie|okropnie|koszmarnie|tragicznie|płakał|płakała|beznadziejnie|kryzys|desperacja/.test(t)) return 'terrible';
  if (/źle|smutno|zmęczon|frustruj|zdenerwow|stres|przygnębi|niepokój|ciężki dzień/.test(t)) return 'bad';
  if (/dobrze|miło|fajnie|przyjemnie|pozytywnie|zadowolona|zadowolony/.test(t)) return 'good';
  return 'neutral';
}

async function inferMoodWithAI(content: string): Promise<Mood> {
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3-mini',
        max_tokens: 10,
        messages: [
          { role: 'system', content: MOOD_SYSTEM_PROMPT },
          { role: 'user', content },
        ],
      }),
    });
    if (!res.ok) return inferMoodLocally(content);
    const data = await res.json();
    const raw = data.choices[0].message.content.trim().toLowerCase() as Mood;
    return (['great', 'good', 'neutral', 'bad', 'terrible'] as Mood[]).includes(raw)
      ? raw
      : inferMoodLocally(content);
  } catch {
    return inferMoodLocally(content);
  }
}

const FREUD_SYSTEM_PROMPT = `Jesteś Zygmuntem Freudem — wiedeńskim neurologiem i twórcą psychoanalizy. Rozmawiasz z osobą, która prowadzi dziennik i chce lepiej rozumieć siebie.

Twój styl:
- Mówisz po polsku, lecz możesz wplatać pojedyncze niemieckie zwroty (np. "das Unbewusste", "Jawohl", "Sehr interessant", "Wunderbar")
- Zwracasz się bezpośrednio przez "ty" — jesteś ciepły, bezpośredni, ale wciąż uważny i refleksyjny
- Zadajesz pytania zwrotne — nie dajesz gotowych odpowiedzi ani praktycznych rad
- Nawiązujesz do pojęć psychoanalizy: nieświadomość, id, ego, superego, mechanizmy obronne, marzenia senne, przeniesienie, sublimacja
- Obserwujesz, nie oceniasz. Prowokujesz do refleksji i własnych odkryć
- Nigdy nie dajesz porad praktycznych — prowadzisz przez pytania, nie przez instrukcje
- Odpowiedzi są zwięzłe (2-4 zdania) i zawsze kończą się pytaniem zwrotnym

BEZWZGLĘDNY ZAKAZ: Nigdy nie używasz żadnych odniesień seksualnych, erotycznych ani cielesnych.

Pamiętaj: Twoim celem nie jest rozwiązanie problemu, lecz pomoc w jego samodzielnym odkryciu.`;

// ── Tool implementations ───────────────────────────────────────────────────

async function toolAddEntry(args: { content: string; date?: string; mood?: number }): Promise<string> {
  const content = args.content?.trim();
  if (!content) throw new Error('content is required');

  const entryDate = args.date ?? new Date().toISOString().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) throw new Error('date must be in YYYY-MM-DD format');

  let mood: Mood;
  if (args.mood !== undefined) {
    if (!Number.isInteger(args.mood) || args.mood < 1 || args.mood > 5) throw new Error('mood must be 1–5');
    mood = MOOD_FROM_SCORE[args.mood];
  } else {
    mood = await inferMoodWithAI(content);
  }

  const supabase = createAdminClient();
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
      .update({ content: (existing.content as string) + htmlContent, mood, updated_at: now })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return `Entry updated for ${entryDate}. Mood: ${mood} (${MOOD_TO_SCORE[mood]}/5).`;
  }

  const { data: anyEntry } = await supabase.from('entries').select('user_id').limit(1).maybeSingle();
  let userId: string;
  if (anyEntry?.user_id) {
    userId = anyEntry.user_id as string;
  } else {
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr || !authUsers.users.length) throw new Error('No user found');
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
  if (error) throw new Error(error.message);

  return `Entry created for ${entryDate}. Mood: ${mood} (${MOOD_TO_SCORE[mood]}/5).`;
}

async function toolAskFreud(args: { question: string; date?: string }): Promise<string> {
  const question = args.question?.trim();
  if (!question) throw new Error('question is required');

  const entryDate = args.date ?? new Date().toISOString().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) throw new Error('date must be in YYYY-MM-DD format');

  const supabase = createAdminClient();
  const { data: entry } = await supabase
    .from('entries')
    .select('date, content, mood')
    .eq('date', entryDate)
    .maybeSingle();

  const contextContent = entry
    ? `Bieżący wpis pacjenta (${entry.date}, nastrój: ${entry.mood}):\n${stripHtml(entry.content as string)}`
    : 'Pacjent nie ma wpisu na tę datę.';

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}`, 'Content-Type': 'application/json' },
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

  if (!res.ok) throw new Error('AI communication error');
  const data = await res.json();
  return data.choices[0].message.content as string;
}

async function toolGetEntry(args: { date: string }): Promise<string> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error('date must be in YYYY-MM-DD format');

  const supabase = createAdminClient();
  const { data: entry, error } = await supabase
    .from('entries')
    .select('date, content, mood, created_at')
    .eq('date', args.date)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!entry) return `No entry found for ${args.date}.`;

  const moodScore = MOOD_TO_SCORE[entry.mood as string] ?? 3;
  return `Date: ${entry.date}\nMood: ${entry.mood} (${moodScore}/5)\nContent: ${stripHtml(entry.content as string)}`;
}

// ── MCP JSON-RPC handler ───────────────────────────────────────────────────

type McpMessage = {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
};

async function handleMessage(msg: McpMessage): Promise<Record<string, unknown> | null> {
  const { method, params, id } = msg;

  // Notifications (no id) — no response
  if (id === undefined) return null;

  const ok = (result: unknown) => ({ jsonrpc: '2.0', result, id });
  const err = (code: number, message: string) => ({ jsonrpc: '2.0', error: { code, message }, id });

  try {
    switch (method) {
      case 'initialize':
        return ok({
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'moodiary', version: '1.0.0' },
        });

      case 'ping':
        return ok({});

      case 'tools/list':
        return ok({ tools: TOOLS });

      case 'tools/call': {
        const { name, arguments: args = {} } = params as { name: string; arguments?: Record<string, unknown> };
        let text: string;

        if (name === 'add_entry') {
          text = await toolAddEntry(args as Parameters<typeof toolAddEntry>[0]);
        } else if (name === 'ask_freud') {
          text = await toolAskFreud(args as Parameters<typeof toolAskFreud>[0]);
        } else if (name === 'get_entry') {
          text = await toolGetEntry(args as Parameters<typeof toolGetEntry>[0]);
        } else {
          return err(-32602, `Unknown tool: ${name}`);
        }

        return ok({ content: [{ type: 'text', text }] });
      }

      default:
        return err(-32601, `Method not found: ${method}`);
    }
  } catch (e) {
    return err(-32603, e instanceof Error ? e.message : 'Internal error');
  }
}

// ── Route handlers ─────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  if (!(await checkApiAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  }
  return Response.json(
    { name: 'moodiary', version: '1.0.0', protocol: '2024-11-05', tools: TOOLS.map((t) => t.name) },
    { headers: CORS_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  if (!(await checkApiAuth(request))) {
    return Response.json(
      { jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  let body: McpMessage | McpMessage[];
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map(handleMessage))).filter(Boolean);
    return Response.json(responses, { headers: CORS_HEADERS });
  }

  const result = await handleMessage(body);
  if (result === null) return new Response(null, { status: 202, headers: CORS_HEADERS });
  return Response.json(result, { headers: CORS_HEADERS });
}
