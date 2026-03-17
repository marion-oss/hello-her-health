'use client';

import { useState, useEffect } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number; // ms per character
  className?: string;
}

export function Typewriter({ text, speed = 45, className }: TypewriterProps) {
  const [index, setIndex] = useState(0);

  // Reset when text changes
  useEffect(() => {
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index >= text.length) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), speed);
    return () => clearTimeout(timer);
  }, [index, text, speed]);

  return (
    <span className={className}>
      {text.slice(0, index)}
      {index < text.length && (
        <span className="animate-pulse opacity-60">|</span>
      )}
    </span>
  );
}
