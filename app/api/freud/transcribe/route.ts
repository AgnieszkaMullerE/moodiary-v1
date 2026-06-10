import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const audio = formData.get('audio') as Blob | null;

  if (!audio) {
    return Response.json({ error: 'Brak pliku audio' }, { status: 400 });
  }

  const grokForm = new FormData();
  grokForm.append('file', audio, 'recording.webm');
  grokForm.append('model', 'whisper-large-v3');
  grokForm.append('language', 'pl');
  grokForm.append('response_format', 'json');

  const response = await fetch('https://api.x.ai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
    },
    body: grokForm,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('xAI STT error:', err);
    return Response.json({ error: 'Błąd transkrypcji' }, { status: 502 });
  }

  const data = await response.json();
  return Response.json({ text: data.text ?? '' });
}
