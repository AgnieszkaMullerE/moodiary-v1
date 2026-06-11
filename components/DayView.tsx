'use client';

import { useState, useRef, useCallback } from 'react';
import type { Entry, Mood } from '@/lib/types';
import MoodFace from './MoodFace';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

/** "WTOREK, 26 MAJA" — mała etykieta daty nad tytułem */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).toUpperCase();
}

/** Zamienia HTML z TipTapa na czysty tekst do dużego wyświetlania */
function htmlToDisplayText(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/gi, '\n')   // akapity → nowe linie
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/ {2,}/g, ' ')
    .trim();
}

const MOOD_ORDER: Mood[] = ['terrible', 'bad', 'neutral', 'good', 'great'];

const softMask = {
  WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 38%, transparent 72%)',
  maskImage: 'radial-gradient(circle at 50% 50%, black 38%, transparent 72%)',
} as React.CSSProperties;

interface Props {
  entry: Entry | null;
  date: string;
  loading?: boolean;
  onSave?: (text: string) => Promise<void>;
  selectedMood?: Mood;
  onMoodChange?: (mood: Mood) => void;
}

function VoiceButton({ onSave }: { onSave?: (text: string) => Promise<void> }) {
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTextRef = useRef('');
  const interimTextRef = useRef('');
  const shouldSaveRef = useRef(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const doSave = useCallback(async (text: string) => {
    if (!text || !onSaveRef.current) return;
    setSaving(true);
    try {
      await onSaveRef.current(text);
      setTranscript('');
      finalTextRef.current = '';
      interimTextRef.current = '';
    } finally {
      setSaving(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    finalTextRef.current = '';
    interimTextRef.current = '';
    shouldSaveRef.current = false;
    setTranscript('');

    const recognition = new SR();
    recognition.lang = 'pl-PL';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTextRef.current += (finalTextRef.current ? ' ' : '') + t.trim();
          interimTextRef.current = '';
        } else {
          interim = t;
        }
      }
      interimTextRef.current = interim;
      setTranscript(
        finalTextRef.current + (interim ? (finalTextRef.current ? ' ' : '') + interim : '')
      );
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('SpeechRecognition error:', e.error);
      }
      shouldSaveRef.current = false;
      setRecording(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
      /* Zapisz dopiero po onend — wtedy API sfinalalizowało wszystkie wyniki */
      if (shouldSaveRef.current) {
        shouldSaveRef.current = false;
        const combined = (
          finalTextRef.current +
          (interimTextRef.current
            ? (finalTextRef.current ? ' ' : '') + interimTextRef.current
            : '')
        ).trim();
        doSave(combined);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, [doSave]);

  const handleMicClick = useCallback(() => {
    if (saving) return;

    if (recording) {
      /* Ustaw flagę zapisu, zatrzymaj — zapis nastąpi w onend */
      shouldSaveRef.current = true;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setRecording(false);
    } else {
      startRecording();
    }
  }, [recording, saving, startRecording]);

  return (
    <div className="flex flex-col items-center">

      {/* Górny obszar — stała wys. h-14, nie przesuwa przycisku */}
      <div className="h-14 flex items-end justify-center pb-3 w-full max-w-[280px] px-3">
        {recording ? (
          <p className="text-sm text-gray-500 text-center leading-tight line-clamp-2">
            {transcript || <span className="italic">Słucham…</span>}
          </p>
        ) : (
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-gray-400">
            Brak wpisu
          </p>
        )}
      </div>

      {/* Przycisk: mikrofon / czerwony stop / spinner zapisu */}
      <button
        type="button"
        onClick={handleMicClick}
        disabled={saving}
        className={[
          'w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 overflow-hidden transform-gpu',
          recording
            ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white'
            : 'bg-[#1C1C1E] hover:bg-[#1C1C1E]/90 text-white dark:bg-white dark:hover:bg-white/90 dark:text-[#1C1C1E]',
        ].join(' ')}
        aria-label={recording ? 'Zatrzymaj i zapisz' : 'Nagraj przemyślenia'}
      >
        {saving ? (
          /* Spinner — zapis w toku */
          <div className="size-7 rounded-full border-[3px] border-white/20 border-t-white dark:border-[#1C1C1E]/20 dark:border-t-[#1C1C1E] animate-spin" />
        ) : recording ? (
          /* Kwadrat stop */
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
          </svg>
        ) : (
          /* Mikrofon */
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M5 10c0 3.866 3.134 7 7 7s7-3.134 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {/* Dolny obszar — symetryczny z górnym, h-14 */}
      <div className="h-14 flex items-start justify-center pt-3 w-full">
        <p className="text-sm text-gray-400">
          Dotknij, żeby nagrać przemyślenia.
        </p>
      </div>

    </div>
  );
}

export default function DayView({ entry, date, loading, onSave, selectedMood, onMoodChange }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="size-6 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-full px-5" style={{ paddingBottom: '115px' }}>
        <VoiceButton onSave={onSave} />
      </div>
    );
  }

  const plainText = htmlToDisplayText(entry.content);
  const activeMood = selectedMood ?? entry.mood;

  return (
    <div className="flex flex-col px-6 pt-5 pb-10">

      {/* Wiersz: data (lewo) + wyszarzony mikrofon (prawo) */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400">
          {formatDateLabel(entry.date)}
        </p>
        <div className="w-8 h-8 rounded-full bg-gray-300/60 dark:bg-white/25 flex items-center justify-center opacity-50 dark:opacity-60 text-gray-500 dark:text-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M5 10c0 3.866 3.134 7 7 7s7-3.134 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Treść wpisu — szeryfowy, główna rola */}
      <p className="font-[family-name:var(--font-display)] text-[26px] font-semibold leading-[1.25] tracking-tight text-gray-900 dark:text-white whitespace-pre-line">
        {plainText || <span className="text-gray-300 dark:text-gray-600 font-normal italic">Bez treści</span>}
      </p>

      {/* Separator */}
      <div className="mt-8 mb-5 h-px bg-gray-100 dark:bg-white/10" />

      {/* Ocena nastroju */}
      <p className="text-[9px] font-semibold tracking-[0.22em] uppercase text-gray-400 mb-4">
        Jak się dzisiaj czujesz?
      </p>
      <div className="flex items-center gap-3">
        {MOOD_ORDER.map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => onMoodChange?.(mood)}
            className={[
              'rounded-full transition-all active:scale-90',
              activeMood === mood
                ? 'opacity-100 scale-105'
                : 'opacity-35 hover:opacity-60',
            ].join(' ')}
            aria-label={mood}
            aria-pressed={activeMood === mood}
          >
            <div style={softMask}>
              <MoodFace mood={mood} size={30} />
            </div>
          </button>
        ))}
      </div>

    </div>
  );
}
