import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Takumiro — AI Assistant',
  description: 'Experience the AI voice assistant.',
};

export default function AnimationPage() {
  notFound();
}
