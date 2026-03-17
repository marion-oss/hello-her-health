export type OrbState = 'idle' | 'thinking' | 'speaking';

export interface ScriptStep {
  id: string;
  state: OrbState;
  text: string;
  /** null = hold on this step indefinitely until goTo() is called */
  durationMs: number | null;
  /** key into buttons.json — which button set to show on this step */
  buttons?: string;
}

export interface ButtonConfig {
  label: string;
  color: string;
  /** step id to jump to when this button is clicked */
  goto: string;
  /** if set, opens the result modal for this task type */
  modal?: string;
}

export type ButtonsMap = Record<string, ButtonConfig[]>;
