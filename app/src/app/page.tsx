import type { Metadata } from 'next';
import { AnimationClient } from '@/components/AnimationClient';

export const metadata: Metadata = {
  title: 'Takumiro — AI Assistant',
  description: 'Experience the AI voice assistant.',
};

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#080808]">
      <AnimationClient />
    </main>
  );
}
