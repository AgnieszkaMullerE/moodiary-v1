'use client';

import { useState, useRef, useCallback } from 'react';

interface Props {
  onFreudOpen: (initialMessage?: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onFreudOpen, disabled }: Props) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const openFreud = useCallback((msg?: string) => {
    setText('');
    inputRef.current?.blur();
    onFreudOpen(msg);
  }, [onFreudOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      openFreud(text.trim() || undefined);
    }
  };

  const handleFocus = () => {
    if (!text.trim()) openFreud();
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        if (blob.size < 100) {
          // Zbyt krótkie nagranie — otwórz czat bez tekstu
          onFreudOpen();
          setTranscribing(false);
          return;
        }
        setTranscribing(true);
        try {
          const ext = mr.mimeType.includes('ogg') ? 'ogg' : 'webm';
          const fd = new FormData();
          fd.append('audio', blob, `recording.${ext}`);
          const res = await fetch('/api/freud/transcribe', { method: 'POST', body: fd });
          if (res.ok) {
            const { text: transcribed } = await res.json();
            onFreudOpen(transcribed?.trim() || undefined);
          } else {
            console.error('Transcribe error:', await res.text());
            onFreudOpen();
          }
        } catch (err) {
          console.error('Transcribe fetch error:', err);
          onFreudOpen();
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start(100); // zbierz chunk co 100ms — nie czekaj na stop
      setRecording(true);
    } catch (err) {
      console.error('Mic access error:', err);
    }
  }, [onFreudOpen]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const handleButtonClick = useCallback(() => {
    if (disabled || transcribing) return;
    if (recording) {
      stopRecording();
    } else if (text.trim()) {
      openFreud(text.trim());
    } else {
      startRecording();
    }
  }, [disabled, transcribing, recording, text, stopRecording, openFreud, startRecording]);

  return (
    <div className="px-4 pt-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-2 bg-white dark:bg-[#282146] rounded-full pl-5 pr-3 h-[52px] shadow-[0_4px_24px_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.4)]">

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={
            transcribing ? 'Transkrybuję...' :
            recording ? 'Nagrywam...' :
            'Napisz do dr Freuda...'
          }
          disabled={disabled || recording || transcribing}
          className="flex-1 bg-transparent text-sm text-[#767387] dark:text-[#A89EC4] placeholder-[#767387] dark:placeholder-[#7A6EA0] outline-none disabled:opacity-50 min-w-0"
        />

        {/* Attachment icon */}
        <button
          type="button"
          className="shrink-0 flex items-center justify-center transition-opacity hover:opacity-70"
          aria-label="Dodaj załącznik"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="#767387" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Mic / Stop / Spinner / Send — stały rozmiar size-10, stałe miejsce */}
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={disabled}
          className={[
            'size-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40',
            recording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-black hover:bg-black/80',
          ].join(' ')}
          aria-label={
            recording ? 'Zatrzymaj nagrywanie' :
            transcribing ? 'Transkrybuję...' :
            text.trim() ? 'Wyślij wiadomość' :
            'Nagraj wiadomość głosową'
          }
        >
          {transcribing ? (
            <div className="size-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : recording ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" fill="white" />
            </svg>
          ) : text.trim() ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" stroke="white" strokeWidth="2" />
              <path d="M5 10c0 3.866 3.134 7 7 7s7-3.134 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 17v3" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 20h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>

      </div>
    </div>
  );
}
