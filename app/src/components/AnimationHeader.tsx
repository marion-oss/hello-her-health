'use client';

interface AnimationHeaderProps {
  onOpenSheet: () => void;
}

export function AnimationHeader({ onOpenSheet }: AnimationHeaderProps) {
  return (
    <div className="absolute top-4 right-4 z-30 sm:top-5 sm:right-6">
      <button
        onClick={onOpenSheet}
        className="group relative rounded-full px-8 py-4 text-base font-semibold text-[#F3F4F4] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] sm:px-12 sm:py-5 sm:text-2xl"
        style={{ background: 'linear-gradient(135deg, #612D53, #853953)' }}
      >
        <span className="relative z-10">Zugang anfordern →</span>
        <span className="absolute inset-0 rounded-full bg-white/0 transition-all duration-300 group-hover:bg-white/10" />
      </button>
    </div>
  );
}
