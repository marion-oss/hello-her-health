import { useState, useEffect, useCallback } from 'react';
import type { OrbState, ScriptStep } from './orb.types';
import scriptData from '@/app/animation/script.json';

const SCRIPT = scriptData as ScriptStep[];

export function useOrbScript() {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = SCRIPT[stepIndex];

  useEffect(() => {
    if (currentStep.durationMs === null) return;
    const timer = setTimeout(() => {
      setStepIndex((i) => (i + 1) % SCRIPT.length);
    }, currentStep.durationMs);
    return () => clearTimeout(timer);
  }, [stepIndex, currentStep.durationMs]);

  const goTo = useCallback((stepId: string) => {
    const idx = SCRIPT.findIndex((s) => s.id === stepId);
    if (idx !== -1) setStepIndex(idx);
  }, []);

  return {
    currentStep,
    currentState: currentStep.state as OrbState,
    currentText: currentStep.text,
    goTo,
  };
}
