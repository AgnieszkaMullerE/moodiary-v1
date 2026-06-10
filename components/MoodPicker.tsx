'use client';

import MoodFace from './MoodFace';
import type { Mood } from '@/lib/types';

const MOODS: Mood[] = ['terrible', 'bad', 'neutral', 'good', 'great'];

/* Soft-brush mask: face fades out gently at edges like a painted blob */
const softMask = {
  WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 38%, transparent 72%)',
  maskImage: 'radial-gradient(circle at 50% 50%, black 38%, transparent 72%)',
} as React.CSSProperties;

interface Props {
  value: Mood;
  onChange: (mood: Mood) => void;
  disabled?: boolean;
}

export default function MoodPicker({ value, onChange, disabled }: Props) {
  return (
    /* No background — floats above app bg, above the dark InputBar pill */
    <div className="flex items-center justify-around px-6 pt-2 pb-0">
      {MOODS.map((mood) => (
        <button
          key={mood}
          type="button"
          onClick={() => !disabled && onChange(mood)}
          disabled={disabled}
          className={`p-0.5 rounded-full transition-all active:scale-90 ${
            value === mood
              ? 'opacity-100 scale-110'
              : 'opacity-40 hover:opacity-65'
          }`}
          aria-label={mood}
          aria-pressed={value === mood}
        >
          {/* Wrapper applies the soft brush mask */}
          <div style={softMask}>
            <MoodFace mood={mood} size={42} />
          </div>
        </button>
      ))}
    </div>
  );
}
