import { createAdminClient } from '@/lib/supabase/admin';
import { checkApiAuth } from '@/lib/api-auth';
import type { NextRequest } from 'next/server';
import type { Mood } from '@/lib/types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

const MOOD_SCORE: Record<Mood, number> = {
  terrible: 1,
  bad: 2,
  neutral: 3,
  good: 4,
  great: 5,
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

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  if (!(await checkApiAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  }

  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { error: 'Nieprawidłowy format daty. Użyj YYYY-MM-DD' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const supabase = createAdminClient();
  const { data: entry, error } = await supabase
    .from('entries')
    .select('date, content, mood, created_at')
    .eq('date', date)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  if (!entry) {
    return Response.json(
      { error: 'Brak wpisu dla tej daty' },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  return Response.json(
    {
      date: entry.date,
      content: stripHtml(entry.content as string),
      mood: entry.mood,
      moodScore: MOOD_SCORE[(entry.mood as Mood) ?? 'neutral'] ?? 3,
      createdAt: entry.created_at,
    },
    { headers: CORS_HEADERS },
  );
}
