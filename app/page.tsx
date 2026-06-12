'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import WeekBar from '@/components/WeekBar';
import DayView from '@/components/DayView';
import InputBar from '@/components/InputBar';
import FreudChat from '@/components/FreudChat';
import { getEntries, saveEntry } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import type { Entry, Mood } from '@/lib/types';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Dobranoc.';
  if (h < 12) return 'Dzień dobry.';
  if (h < 18) return 'Miłego dnia.';
  if (h < 22) return 'Dobry wieczór.';
  return 'Dobranoc.';
}

function formatTodayLabel(): string {
  return new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

export default function TodayPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<Mood>('neutral');

  // Freud chat state
  const [freudOpen, setFreudOpen] = useState(false);
  const [freudInitialMessage, setFreudInitialMessage] = useState<string | undefined>();

  const loadEntries = useCallback(async () => {
    const data = await getEntries();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const entryDates = useMemo(() => new Set(entries.map((e) => e.date)), [entries]);

  const entryMoods = useMemo(() => {
    const map: Record<string, Mood> = {};
    entries.forEach((e) => { map[e.date] = e.mood; });
    return map;
  }, [entries]);

  const entryExcerpts = useMemo(() => {
    const map: Record<string, string> = {};
    entries.forEach((e) => {
      const text = stripHtml(e.content);
      map[e.date] = text.length > 70 ? text.slice(0, 70) + '…' : text;
    });
    return map;
  }, [entries]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.date === selectedDate) ?? null,
    [entries, selectedDate],
  );

  useEffect(() => {
    setSelectedMood(selectedEntry?.mood ?? 'neutral');
  }, [selectedDate, selectedEntry]);

  const handleMoodChange = useCallback(async (mood: Mood) => {
    setSelectedMood(mood);
    if (!selectedEntry) return;
    try {
      await saveEntry({ ...selectedEntry, mood, updatedAt: new Date().toISOString() });
      await loadEntries();
    } catch {
      toast.error('Nie udało się zapisać nastroju');
    }
  }, [selectedEntry, loadEntries]);

  // Journal save (used by DayView voice button)
  const handleSave = useCallback(async (text: string) => {
    const now = new Date().toISOString();
    try {
      if (selectedEntry) {
        const newContent = selectedEntry.content
          ? `${selectedEntry.content}<p>${text}</p>`
          : `<p>${text}</p>`;
        await saveEntry({ ...selectedEntry, content: newContent, mood: selectedMood, updatedAt: now });
      } else {
        await saveEntry({
          id: uuidv4(),
          date: selectedDate,
          title: '',
          content: `<p>${text}</p>`,
          mood: selectedMood,
          createdAt: now,
          updatedAt: now,
        });
      }
      await loadEntries();
    } catch {
      toast.error('Nie udało się zapisać wpisu');
    }
  }, [selectedEntry, selectedDate, selectedMood, loadEntries]);

  // Open Freud chat (called from InputBar)
  const handleFreudOpen = useCallback((initialMessage?: string) => {
    setFreudInitialMessage(initialMessage);
    setFreudOpen(true);
  }, []);

  const handleFreudClose = useCallback(() => {
    setFreudOpen(false);
    setFreudInitialMessage(undefined);
  }, []);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  return (
    <div className="relative flex flex-col md:flex-row h-full overflow-hidden">

      {/* Animowane blobs tła */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="blob-a absolute -top-20 -right-16 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, #4338CA 0%, transparent 70%)', opacity: 0.25 }} />
        <div className="blob-b absolute -top-8 left-4 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', opacity: 0.2 }} />
        <div className="blob-c absolute top-1/2 -left-20 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, #1E3A8A 0%, transparent 70%)', opacity: 0.3 }} />
        <div className="blob-d absolute top-2/5 right-0 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, #9333EA 0%, transparent 70%)', opacity: 0.2 }} />
        <div className="blob-b-r absolute -bottom-10 -right-8 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, #BE185D 0%, transparent 70%)', opacity: 0.25 }} />
        <div className="blob-a-r absolute -bottom-16 left-16 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)', opacity: 0.2 }} />
      </div>

      {/* DESKTOP: lewa kolumna */}
      <aside className="hidden md:flex flex-col w-[300px] shrink-0 border-r border-gray-100/80 overflow-hidden relative z-10">
        <div className="px-5 pt-6 pb-4 shrink-0">
          <p className="text-[13px] font-semibold text-gray-400 tracking-wide">
            mój-dzienniczek.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <WeekBar
            selectedDate={selectedDate}
            onSelectDay={setSelectedDate}
            entryDates={entryDates}
            entryMoods={entryMoods}
            entryExcerpts={entryExcerpts}
            vertical
          />
        </div>
        {/* Wylogowanie + Dokumentacja — desktop */}
        <div className="px-5 py-4 shrink-0 border-t border-gray-100/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-[12px] text-black/80 dark:text-white hover:opacity-60 transition-opacity"
            aria-label="Wyloguj się"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M18.4 5.6A9 9 0 1 0 18.4 18.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 8.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Wyloguj
          </button>
          <Link
            href="/docs"
            className="flex items-center justify-center text-black/80 dark:text-white hover:opacity-60 transition-opacity"
            aria-label="Dokumentacja API"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </aside>

      {/* GŁÓWNA KOLUMNA */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">

        {/* Top bar — mobile: ikony dokumentacji i wylogowania */}
        <div
          className="md:hidden relative z-20 flex items-center justify-end gap-2 px-4 shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <Link
            href="/docs"
            className="w-[34px] h-[34px] rounded-full bg-white dark:bg-[#3A3060] flex items-center justify-center hover:opacity-70 transition-opacity text-gray-500 dark:text-white"
            aria-label="Dokumentacja API"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-[34px] h-[34px] rounded-full bg-white dark:bg-[#3A3060] flex items-center justify-center hover:opacity-70 transition-opacity text-gray-500 dark:text-white"
            aria-label="Wyloguj się"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M18.4 5.6A9 9 0 1 0 18.4 18.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 8.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Nagłówek — tylko mobile */}
        <div className="md:hidden relative z-10 px-5 pt-5 pb-3 shrink-0">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-display)] tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400 mt-2">{formatTodayLabel()}</p>
        </div>

        {/* WeekBar poziomy — tylko mobile */}
        <div className="md:hidden relative z-10 shrink-0">
          <WeekBar
            selectedDate={selectedDate}
            onSelectDay={setSelectedDate}
            entryDates={entryDates}
            entryMoods={entryMoods}
          />
        </div>

        {/* DayView */}
        <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
          <div className="md:max-w-2xl md:mx-auto h-full">
            <DayView
              entry={selectedEntry}
              date={selectedDate}
              loading={loading}
              onSave={handleSave}
              selectedMood={selectedMood}
              onMoodChange={handleMoodChange}
            />
          </div>
        </div>

        {/* InputBar — wyzwala Freud chat */}
        <div className="relative z-10 shrink-0">
          <InputBar onFreudOpen={handleFreudOpen} />
        </div>

      </div>

      {/* FreudChat — bottom sheet overlay */}
      <FreudChat
        open={freudOpen}
        onClose={handleFreudClose}
        selectedDate={selectedDate}
        selectedEntry={selectedEntry}
        allEntries={entries}
        initialMessage={freudInitialMessage}
        onInitialMessageConsumed={() => setFreudInitialMessage(undefined)}
      />

    </div>
  );
}
