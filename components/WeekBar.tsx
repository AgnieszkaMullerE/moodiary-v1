'use client';

import { useMemo, useRef, useEffect, useCallback } from 'react';
import MoodFace from './MoodFace';
import type { Mood } from '@/lib/types';

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDowIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

interface Props {
  selectedDate: string;
  onSelectDay: (date: string) => void;
  entryDates: Set<string>;
  entryMoods?: Record<string, Mood>;
  entryExcerpts?: Record<string, string>;
  vertical?: boolean;
}

export default function WeekBar({
  selectedDate,
  onSelectDay,
  entryDates,
  entryMoods,
  entryExcerpts,
  vertical,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const todayStr = toDateStr(today);

  // Ref do scrolla: w trybie pionowym = today-2 (żeby dziś był 3. pozycją),
  // w trybie poziomym = dziś wyśrodkowany
  const scrollAnchorRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollAnchorStr = useMemo(() => {
    if (vertical) {
      const d = new Date(today);
      d.setDate(today.getDate() - 2);
      return toDateStr(d);
    }
    return todayStr;
  }, [vertical, today, todayStr]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!scrollRef.current || vertical) return;
    e.preventDefault();
    scrollRef.current.scrollBy({ left: e.deltaY + e.deltaX, behavior: 'smooth' });
  }, [vertical]);

  useEffect(() => {
    if (vertical) return;
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, vertical]);

  // 60 dni: 30 wstecz + dziś + 29 naprzód (chronologicznie)
  const days = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 30 + i);
      return d;
    });
  }, [today]);

  // Scroll do kotwicy przy pierwszym renderze.
  // requestAnimationFrame gwarantuje że layout jest gotowy przed scrollem.
  useEffect(() => {
    requestAnimationFrame(() => {
      const container = scrollRef.current;
      const anchor = scrollAnchorRef.current;
      if (!anchor) return;

      if (vertical) {
        anchor.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else if (container) {
        // Wyśrodkuj kafelek dokładnie w kontenerze
        const cRect = container.getBoundingClientRect();
        const aRect = anchor.getBoundingClientRect();
        const anchorCenter = aRect.left - cRect.left + container.scrollLeft + aRect.width / 2;
        container.scrollLeft = anchorCenter - cRect.width / 2;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── TRYB PIONOWY (desktop sidebar) ── */
  if (vertical) {
    return (
      <div className="flex flex-col">
        {days.map((day) => {
          const str = toDateStr(day);
          const isSelected = str === selectedDate;
          const isToday = str === todayStr;
          const dow = getDowIndex(day);
          const mood = entryMoods?.[str];
          const excerpt = entryExcerpts?.[str];

          return (
            <button
              key={str}
              ref={str === scrollAnchorStr ? scrollAnchorRef : undefined}
              type="button"
              onClick={() => onSelectDay(str)}
              className={[
                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-l-[2.5px]',
                isSelected
                  ? 'border-gray-900 bg-white dark:border-white/40 dark:bg-white/10'
                  : 'border-transparent bg-white/50 dark:bg-transparent hover:bg-white/75 dark:hover:bg-white/8',
              ].join(' ')}
            >
              {/* Kolumna: skrót dnia + liczba + twarzyczka */}
              <div className="flex flex-col items-center w-7 shrink-0">
                <span className={[
                  'text-[8px] uppercase tracking-widest leading-none mb-0.5',
                  isToday ? 'text-gray-500' : 'text-gray-400',
                ].join(' ')}>
                  {DAY_LABELS[dow]}
                </span>
                <span className={[
                  'text-[15px] font-bold leading-none',
                  isSelected ? 'text-gray-900 dark:text-white' : isToday ? 'text-gray-600 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500',
                ].join(' ')}>
                  {day.getDate()}
                </span>
                {mood && (
                  <div className="mt-1.5">
                    <MoodFace mood={mood} size={13} />
                  </div>
                )}
              </div>

              {/* Fragment tekstu */}
              {excerpt ? (
                <p className={[
                  'text-[11px] leading-[1.45] line-clamp-2 flex-1 pt-0.5',
                  isSelected ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400',
                ].join(' ')}>
                  {excerpt}
                </p>
              ) : (
                <div className="flex-1" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  /* ── TRYB POZIOMY (mobile) ── */
  return (
    <div
      ref={scrollRef}
      className="flex gap-2.5 px-4 py-3 overflow-x-auto scrollbar-hide"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
      }}
    >
      {days.map((day) => {
        const str = toDateStr(day);
        const isSelected = str === selectedDate;
        const dow = getDowIndex(day);

        const tileContent = (
          <>
            <span className={[
              'text-[9px] uppercase tracking-widest leading-none font-semibold',
              isSelected ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-white/50',
            ].join(' ')}>
              {DAY_LABELS[dow]}
            </span>
            <span className={[
              'text-[24px] leading-tight',
              isSelected ? 'font-extrabold text-gray-900 dark:text-white' : 'font-semibold text-gray-500 dark:text-white/60',
            ].join(' ')}>
              {day.getDate()}
            </span>
            <div className="mt-0.5 h-[18px] flex items-center justify-center">
              {entryMoods?.[str] ? (
                <MoodFace mood={entryMoods[str]} size={16} />
              ) : (
                <div className="size-1.5 rounded-full bg-transparent" />
              )}
            </div>
          </>
        );

        if (isSelected) {
          return (
            <div
              key={str}
              className="flex-none rounded-[8px] p-px
                bg-gray-900 shadow-[0_4px_10px_0_#DCD6EC]
                dark:bg-white/20 dark:border dark:border-white/50 dark:p-0 dark:shadow-[0_4px_10px_0_#472E8A]"
            >
              <button
                ref={str === scrollAnchorStr ? scrollAnchorRef : undefined}
                type="button"
                onClick={() => onSelectDay(str)}
                className="flex flex-col items-center pt-2.5 pb-2.5 cursor-pointer transition-all active:scale-95 w-[54px] gap-0.5 bg-white dark:bg-transparent rounded-[7px] dark:rounded-[8px]"
              >
                {tileContent}
              </button>
            </div>
          );
        }

        return (
          <button
            key={str}
            ref={str === scrollAnchorStr ? scrollAnchorRef : undefined}
            type="button"
            onClick={() => onSelectDay(str)}
            className="flex-none flex flex-col items-center pt-2.5 pb-2.5 rounded-[8px] cursor-pointer transition-all active:scale-95 w-[54px] gap-0.5 bg-white/60 dark:bg-white/6"
          >
            {tileContent}
          </button>
        );
      })}
    </div>
  );
}
