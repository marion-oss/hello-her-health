'use client';

import { useState } from 'react';
import { OrbCanvas } from '@/components/orb/OrbCanvas';
import { AnimationHeader } from '@/components/AnimationHeader';
import { AnimationSheet } from '@/components/AnimationSheet';

const ENDPOINT = 'https://takumiro-landing-api.mcarvalho-de.workers.dev/api/request-access';

export function AnimationClient() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <AnimationHeader onOpenSheet={() => setIsSheetOpen(true)} />
      <OrbCanvas onOpenSheet={() => setIsSheetOpen(true)} />
      <AnimationSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} endpoint={ENDPOINT} />
    </>
  );
}
