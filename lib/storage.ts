import { createClient } from './supabase/client';
import type { Entry } from './types';

function toEntry(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    date: row.date as string,
    title: row.title as string,
    content: row.content as string,
    mood: row.mood as Entry['mood'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getEntries(): Promise<Entry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toEntry);
}

export async function getEntryByDate(date: string): Promise<Entry | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data ? toEntry(data) : null;
}

export async function getEntryById(id: string): Promise<Entry | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toEntry(data) : null;
}

export async function saveEntry(entry: Entry): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Brak zalogowanego użytkownika');

  const { error } = await supabase.from('entries').upsert(
    {
      id: entry.id,
      date: entry.date,
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      user_id: user.id,
    },
    { onConflict: 'user_id,date' }
  );
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
}
