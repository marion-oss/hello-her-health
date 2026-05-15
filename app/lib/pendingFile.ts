/**
 * anoqi — Pending file hand-off.
 *
 * The Documents-list and Chat drop zones use this to stash a freshly-dropped
 * File before navigating to AddDocument, which reads it on mount.
 *
 * It's just a module-level holder — single producer / single consumer at a
 * time, consumed once and cleared. We deliberately do NOT serialise the File
 * through navigation route params: that strips the binary payload.
 */

let pending: File | null = null

export function setPendingFile(file: File | null): void {
  pending = file
}

export function takePendingFile(): File | null {
  const f = pending
  pending = null
  return f
}
