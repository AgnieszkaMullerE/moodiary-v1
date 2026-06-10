import { createClient } from './supabase/client';
import type { FreudMessage, FreudSession } from './types';
import { v4 as uuidv4 } from 'uuid';

function toFreudSession(row: Record<string, unknown>): FreudSession {
  return {
    id: row.id as string,
    entryId: row.entry_id as string,
    date: row.date as string,
    messages: (row.messages as FreudMessage[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getFreudSession(entryId: string): Promise<FreudSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('freud_sessions')
    .select('*')
    .eq('entry_id', entryId)
    .maybeSingle();
  if (error) throw error;
  return data ? toFreudSession(data) : null;
}

export async function getFreudSessionByDate(date: string): Promise<FreudSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('freud_sessions')
    .select('*')
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data ? toFreudSession(data) : null;
}

export async function saveFreudSession(session: FreudSession): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Brak zalogowanego użytkownika');

  const { error } = await supabase.from('freud_sessions').upsert(
    {
      id: session.id,
      entry_id: session.entryId,
      date: session.date,
      user_id: user.id,
      messages: session.messages,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export function createFreudSession(entryId: string, date: string): FreudSession {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    entryId,
    date,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function appendMessage(
  session: FreudSession,
  role: FreudMessage['role'],
  content: string,
): FreudSession {
  const message: FreudMessage = {
    id: uuidv4(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  return {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date().toISOString(),
  };
}
