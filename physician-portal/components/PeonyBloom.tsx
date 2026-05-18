import type { SVGProps } from 'react'

/**
 * Hand-drawn sweet peony bloom on a sage stem.
 * - Petals layered, filled with rose-200
 * - Inner stamen accent in peony-500
 * - Stem in sage-500
 * Approx 80x100 viewbox.
 */
export function PeonyBloom(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      role="img"
      aria-label="Pivoine"
      {...props}
    >
      {/* Stem */}
      <path
        d="M40 96 C 39 80, 42 64, 41 50"
        stroke="var(--sage-500)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Leaf left */}
      <path
        d="M41 72 C 30 70, 22 64, 20 58 C 28 58, 36 62, 41 70 Z"
        fill="var(--sage-300)"
        stroke="var(--sage-500)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Leaf right */}
      <path
        d="M40 80 C 50 80, 58 74, 60 68 C 53 68, 46 72, 40 78 Z"
        fill="var(--sage-400)"
        stroke="var(--sage-500)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Outer back petals */}
      <path
        d="M40 12 C 22 14, 12 28, 14 42 C 16 54, 28 62, 40 60 C 52 62, 64 54, 66 42 C 68 28, 58 14, 40 12 Z"
        fill="var(--rose-200)"
        stroke="var(--rose-300)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Middle petals — left */}
      <path
        d="M40 18 C 28 18, 20 28, 22 38 C 24 46, 32 52, 40 50 Z"
        fill="var(--rose-200)"
        stroke="var(--peony-300)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.95"
      />
      {/* Middle petals — right */}
      <path
        d="M40 18 C 52 18, 60 28, 58 38 C 56 46, 48 52, 40 50 Z"
        fill="var(--rose-200)"
        stroke="var(--peony-300)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.95"
      />
      {/* Inner front petals */}
      <path
        d="M40 26 C 32 26, 28 34, 30 40 C 32 46, 36 48, 40 48 C 44 48, 48 46, 50 40 C 52 34, 48 26, 40 26 Z"
        fill="var(--peony-200)"
        stroke="var(--peony-400)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Stamen / center accent */}
      <circle cx="40" cy="38" r="3.5" fill="var(--peony-500)" />
      <circle cx="36" cy="36" r="1" fill="var(--carnation-400)" />
      <circle cx="44" cy="36" r="1" fill="var(--carnation-400)" />
      <circle cx="40" cy="42" r="1" fill="var(--carnation-400)" />
    </svg>
  )
}

export default PeonyBloom
