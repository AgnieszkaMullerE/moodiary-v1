'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Entry, FreudMessage, FreudSession } from '@/lib/types';
import {
  getFreudSessionByDate,
  saveFreudSession,
  createFreudSession,
  appendMessage,
} from '@/lib/freud-storage';

function getFreudGreeting(): string {
  const h = new Date().getHours();
  return h >= 18 ? 'Dobry wieczór' : 'Dzień dobry';
}

interface Props {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedEntry: Entry | null;
  allEntries: Entry[];
  initialMessage?: string;
  onInitialMessageConsumed?: () => void;
}

function FreudAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#1C1C1E] dark:bg-[#2d2b3d] flex items-center justify-center shrink-0 text-white text-xs font-semibold font-[family-name:var(--font-display)]">
      F
    </div>
  );
}


function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 12L21 4L13 21L11 13L3 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 13L21 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FreudChat({
  open,
  onClose,
  selectedDate,
  selectedEntry,
  allEntries,
  initialMessage,
  onInitialMessageConsumed,
}: Props) {
  const [session, setSession] = useState<FreudSession | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [contextLabel, setContextLabel] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentInitialRef = useRef(false);

  // Load session when date changes or chat opens
  useEffect(() => {
    if (!open) return;
    sentInitialRef.current = false;
    setLoadingSession(true);
    getFreudSessionByDate(selectedDate)
      .then((s) => setSession(s))
      .catch(console.error)
      .finally(() => setLoadingSession(false));
  }, [open, selectedDate]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, minimized]);

  // Reset textarea height when text is cleared after send
  useEffect(() => {
    if (!text && inputRef.current) {
      inputRef.current.style.height = '20px';
    }
  }, [text]);

  // Reset sent flag when a new initialMessage arrives (e.g. second voice recording)
  useEffect(() => {
    if (initialMessage) {
      sentInitialRef.current = false;
    }
  }, [initialMessage]);

  // Pre-fill initial message from InputBar
  useEffect(() => {
    if (open && initialMessage && !sentInitialRef.current) {
      setText(initialMessage);
      onInitialMessageConsumed?.();
    }
  }, [open, initialMessage, onInitialMessageConsumed]);

  const isGlobalQuestion = useCallback((q: string): boolean => {
    const triggers = [
      'miesiąc', 'tydzień', 'wszystk', 'ogółem', 'cały', 'zawsze', 'często',
      'trend', 'wzorzec', 'nastrój', 'zmian', 'ostatni', 'historia',
      'porówn', 'analiz', 'podsumow',
    ];
    const lower = q.toLowerCase();
    return triggers.some((t) => lower.includes(t));
  }, []);

  const sendMessage = useCallback(async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    const useGlobal = isGlobalQuestion(trimmed);
    setContextLabel(useGlobal ? 'Analizuję: wszystkie wpisy' : `Analizuję: wpis z ${selectedDate}`);

    const currentSession = session ?? createFreudSession(
      selectedEntry?.id ?? `no-entry-${selectedDate}`,
      selectedDate,
    );

    const withUser = appendMessage(currentSession, 'user', trimmed);
    setSession(withUser);
    setText('');
    setLoading(true);

    try {
      const res = await fetch('/api/freud/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: withUser.messages,
          currentEntry: selectedEntry
            ? { date: selectedEntry.date, mood: selectedEntry.mood, content: selectedEntry.content }
            : null,
          allEntries: useGlobal
            ? allEntries.map((e) => ({ date: e.date, mood: e.mood, content: e.content }))
            : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => String(res.status));
        console.error('Freud API error:', res.status, errText);
        throw new Error('AI error');
      }
      const { content } = await res.json();

      const withFreud = appendMessage(withUser, 'freud', content);
      setSession(withFreud);
      saveFreudSession(withFreud).catch(console.error);
    } catch {
      const withError = appendMessage(withUser, 'freud', 'Entschuldigung... Coś poszło nie tak. Proszę spróbować ponownie.');
      setSession(withError);
    } finally {
      setLoading(false);
    }
  }, [loading, session, selectedEntry, selectedDate, allEntries, isGlobalQuestion]);

  // Send initial message after session loads
  useEffect(() => {
    if (!open || loadingSession || sentInitialRef.current) return;
    if (initialMessage && initialMessage.trim()) {
      sentInitialRef.current = true;
      setText('');
      sendMessage(initialMessage);
    }
  }, [open, loadingSession, initialMessage, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(text);
    }
  };


  if (!open) return null;

  // Minimized floating chip
  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-[#1C1C1E] dark:bg-[#2d2b3d] text-white rounded-full px-4 py-2.5 shadow-lg hover:bg-black transition-all active:scale-95"
      >
        <FreudAvatar />
        <span className="text-sm font-medium">Dr Freud</span>
        {(session?.messages.length ?? 0) > 0 && (
          <span className="bg-white/20 text-white text-[10px] rounded-full px-1.5 py-0.5 font-semibold">
            {session!.messages.length}
          </span>
        )}
      </button>
    );
  }

  const messages = session?.messages ?? [];

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end pointer-events-none">
      {/* Backdrop (tap to close) */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel wrapper — constrains to app width */}
      <div className="relative pointer-events-none w-full max-w-[430px] mx-auto px-3 pb-3">
      <div
        className="pointer-events-auto flex flex-col bg-white dark:bg-[#18162a] rounded-3xl shadow-2xl"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <FreudAvatar />
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400 dark:text-gray-500">
                Sesja z Dr. Freudem
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Minimize */}
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Minimalizuj"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Zamknij"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="overflow-y-auto scrollbar-hide px-5 py-4 space-y-4" style={{ maxHeight: '50vh' }}>
          {loadingSession ? (
            <div className="flex justify-center py-8">
              <div className="size-5 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-end gap-2 pt-2">
              <div className="max-w-[85%] bg-gray-100 dark:bg-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5">
                <p className="text-base leading-relaxed text-gray-800 dark:text-gray-100 font-[family-name:var(--font-display)]">
                  {getFreudGreeting()}, usiądź wygodnie i powiedz, o czym chciałabyś/chciałbyś dzisiaj porozmawiać?
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}

          {loading && (
            <div className="flex items-end gap-2">
              <div className="bg-gray-100 dark:bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div
          className="shrink-0 px-4 pt-2 border-t border-gray-100 dark:border-white/10"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-[24px] pl-5 pr-2 py-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = 'auto';
                const lineH = 20;
                e.target.style.height = Math.min(e.target.scrollHeight, lineH * 4) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Napisz do dr Freuda..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none disabled:opacity-50 min-w-0 resize-none overflow-y-auto scrollbar-hide leading-5"
              style={{ height: '20px' }}
            />

            {/* Send */}
            <button
              type="button"
              onClick={() => sendMessage(text)}
              disabled={loading || !text.trim()}
              className="size-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40 bg-black dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/90"
              aria-label="Wyślij"
            >
              {loading ? (
                <div className="size-3.5 rounded-full border-2 border-gray-400/30 border-t-gray-400 animate-spin" />
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: FreudMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] bg-black dark:bg-white text-white dark:text-black rounded-2xl rounded-br-sm px-4 py-2.5">
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <div className="max-w-[85%] bg-gray-100 dark:bg-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5">
        <p className="text-base leading-relaxed text-gray-800 dark:text-gray-100 font-[family-name:var(--font-display)]">
          {message.content}
        </p>
      </div>
    </div>
  );
}
