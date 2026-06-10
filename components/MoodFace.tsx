import type { Mood } from '@/lib/types';

// Face elements are wrapped in a scale group so the colored background
// grows independently from the actual face (eyes / mouth / brows).
// Scale = originalFaceSize / newBgSize  →  32 / 42 ≈ 0.762
const S = 'translate(24,24) scale(0.762) translate(-24,-24)';

const faces: Record<Mood, React.ReactNode> = {
  great: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#E5A090" />
      <g transform={S}>
        {/* rosy cheeks */}
        <ellipse cx="11" cy="28" rx="5" ry="3" fill="#C47065" opacity="0.3" />
        <ellipse cx="37" cy="28" rx="5" ry="3" fill="#C47065" opacity="0.3" />
        {/* happy arch eyes */}
        <path d="M12 21 Q16 15 20 21" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M28 21 Q32 15 36 21" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round" />
        {/* big smile */}
        <path d="M12 29 Q24 42 36 29" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  ),

  good: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#D4BE6A" />
      <g transform={S}>
        <circle cx="17" cy="20" r="2.8" fill="#3D2B1F" />
        <circle cx="31" cy="20" r="2.8" fill="#3D2B1F" />
        <path d="M17 29 Q24 35 31 29" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  ),

  neutral: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#93B7CD" />
      <g transform={S}>
        <circle cx="17" cy="20" r="2.8" fill="#3D2B1F" />
        <circle cx="31" cy="20" r="2.8" fill="#3D2B1F" />
        <line x1="17" y1="30" x2="31" y2="30" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  ),

  bad: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#8AA098" />
      <g transform={S}>
        <path d="M11 16 Q16 13 20 17" stroke="#3D2B1F" strokeWidth="2" strokeLinecap="round" />
        <path d="M28 17 Q32 13 37 16" stroke="#3D2B1F" strokeWidth="2" strokeLinecap="round" />
        <circle cx="17" cy="21" r="2.8" fill="#3D2B1F" />
        <circle cx="31" cy="21" r="2.8" fill="#3D2B1F" />
        <path d="M17 32 Q24 26 31 32" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  ),

  terrible: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#BF6258" />
      <g transform={S}>
        <path d="M10 15 Q15 11 20 16" stroke="#3D2B1F" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M28 16 Q33 11 38 15" stroke="#3D2B1F" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="17" cy="21" r="2.8" fill="#3D2B1F" />
        <circle cx="31" cy="21" r="2.8" fill="#3D2B1F" />
        <path d="M17 24 Q15 27 17 29.5 Q19 27 17 24" fill="#B8D4E8" opacity="0.85" />
        <path d="M12 34 Q24 23 36 34" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  ),
};

interface Props {
  mood: Mood;
  size?: number;
}

export default function MoodFace({ mood, size = 40 }: Props) {
  return (
    <span
      style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }}
      aria-hidden="true"
    >
      {faces[mood]}
    </span>
  );
}
