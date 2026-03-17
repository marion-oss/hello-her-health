'use client';

import { useRef, useState, useEffect } from 'react';
import type { ButtonsMap, ButtonConfig, ScriptStep } from './orb.types';
import { useOrbScript } from './useOrbScript';
import { useOrbAnimation } from './useOrbAnimation';
import { Typewriter } from './Typewriter';
import { ResultModal } from './ResultModal';
import type { TaskType } from './ResultModal';
import buttonsData from '@/app/animation/buttons.json';

const BUTTONS_MAP = buttonsData as ButtonsMap;
const FADE_OUT_MS = 350;

export function OrbCanvas({ onOpenSheet }: { onOpenSheet?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentStep, currentState, goTo } = useOrbScript();

  useOrbAnimation(canvasRef, currentState);

  const [displayedStep, setDisplayedStep] = useState<ScriptStep>(currentStep);
  const [textVisible, setTextVisible] = useState(true);

  useEffect(() => {
    if (currentStep.id === displayedStep.id) return;
    if (currentStep.text === displayedStep.text) {
      setDisplayedStep(currentStep);
      return;
    }
    setTextVisible(false);
    const t = setTimeout(() => { setDisplayedStep(currentStep); setTextVisible(true); }, FADE_OUT_MS);
    return () => clearTimeout(t);
  }, [currentStep, displayedStep.id, displayedStep.text]);

  const [activeModal, setActiveModal] = useState<TaskType | null>(null);
  const [clickedBtn,  setClickedBtn]  = useState<string | null>(null);

  function handleButtonClick(btn: ButtonConfig) {
    setClickedBtn(btn.label);
    goTo(btn.goto);
    if (btn.modal) setActiveModal(btn.modal as TaskType);
  }

  function handleModalClose() {
    setActiveModal(null);
    setClickedBtn(null);
    goTo('main-idle');
  }

  const currentButtons = BUTTONS_MAP[displayedStep.buttons ?? ''] ?? [];

  const buttonList = currentButtons.map((btn) => {
    const isClicked = clickedBtn === btn.label;
    return (
      <button
        key={btn.label}
        onClick={() => handleButtonClick(btn)}
        className={[
          'flex items-center gap-3 rounded-full border px-5 py-2.5 text-base font-medium whitespace-nowrap transition-all duration-300 sm:gap-3.5 sm:px-6 sm:py-3 sm:text-lg',
          isClicked
            ? 'border-green-500/50 bg-green-500/15 text-green-400'
            : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30 hover:bg-white/10 hover:text-white/80',
        ].join(' ')}
      >
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full sm:h-3 sm:w-3"
          style={{ backgroundColor: isClicked ? '#4ade80' : btn.color, opacity: isClicked ? 1 : 0.4 }}
        />
        {btn.label}
      </button>
    );
  });

  const typewriterText = (
    <p className={`text-center font-light tracking-wide text-white/85 transition-opacity duration-300 text-lg sm:text-2xl ${textVisible ? 'opacity-100' : 'opacity-0'}`}>
      <Typewriter key={displayedStep.text} text={displayedStep.text} speed={45} />
    </p>
  );

  return (
    <div className="relative w-full h-full flex flex-col sm:block">

      {/* Canvas — full screen on desktop, top portion on mobile */}
      <div className="relative w-full h-[52%] flex-shrink-0 sm:absolute sm:inset-0 sm:h-auto">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
      </div>

      {/* ── Mobile layout: text + buttons stacked below canvas ── */}
      <div className="flex flex-col items-center justify-start gap-5 px-5 pt-4 pb-6 flex-1 sm:hidden">
        {/* Text */}
        <div className="pointer-events-none w-full text-center">
          {typewriterText}
        </div>

        {/* Task buttons */}
        <div className={`flex flex-col items-center gap-3 w-full transition-opacity duration-[2000ms] ${currentState === 'idle' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {buttonList}
        </div>
      </div>

      {/* ── Desktop layout: overlaid text + right-side buttons ── */}

      {/* Buttons — start just past the orb's right edge, left-aligned */}
      <div
        style={{ left: 'calc(50% + 9rem)' }}
        className={`hidden sm:flex absolute inset-y-0 flex-col items-start justify-center gap-3 transition-opacity duration-[2000ms] ${currentState === 'idle' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {buttonList}
      </div>

      {/* Text — bottom overlay */}
      <div className="hidden sm:flex absolute inset-x-0 bottom-20 flex-col items-center px-6 pointer-events-none">
        {typewriterText}
      </div>

      {/* Result modal */}
      <ResultModal taskType={activeModal} onClose={handleModalClose} onOpenSheet={onOpenSheet} />
    </div>
  );
}
