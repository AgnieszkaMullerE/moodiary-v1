'use client';

import { useState, useRef } from 'react';

interface Props {
  onFreudOpen: (initialMessage?: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onFreudOpen, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    setText('');
    inputRef.current?.blur();
    onFreudOpen(trimmed || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFocus = () => {
    if (!text.trim()) onFreudOpen();
  };

  return (
    <div className="px-4 pt-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-2 bg-white dark:bg-[#282146] rounded-full pl-5 pr-3 h-[52px] shadow-[0_4px_24px_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.4)]">

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Napisz do dr Freuda..."
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-[#767387] dark:text-[#A89EC4] placeholder-[#767387] dark:placeholder-[#7A6EA0] outline-none disabled:opacity-50 min-w-0"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className="size-10 rounded-full bg-black flex items-center justify-center shrink-0 hover:bg-black/80 transition-all active:scale-95 disabled:opacity-40"
          aria-label="Wyślij wiadomość do dr Freuda"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

      </div>
    </div>
  );
}
