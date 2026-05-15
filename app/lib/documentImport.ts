/**
 * anoqi — File → text extraction for the Documents flow.
 *
 * Used by AddDocumentScreen + the drag-and-drop zones on DocumentsList
 * and Chat to turn an uploaded File into raw text that processText() can
 * pseudonymise. Text never leaves the device.
 *
 * Supported formats:
 *   - text/plain          — read as UTF-8 directly
 *   - application/pdf     — parsed via pdfjs-dist (page-by-page text)
 *
 * Other types (DOCX, images) throw a typed error so the caller can show
 * a friendly "format pas encore supporté" message. OCR for images is a
 * separate, heavier dependency and is deferred until needed.
 */

export type ImportError =
  | { kind: 'unsupported_type'; mime: string; ext: string }
  | { kind: 'too_large'; size: number }
  | { kind: 'empty' }
  | { kind: 'parse_failed'; cause: unknown }

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB — way more than any sane medical PDF

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    const err: ImportError = { kind: 'too_large', size: file.size }
    throw err
  }

  const ext  = (file.name.split('.').pop() ?? '').toLowerCase()
  const mime = (file.type || '').toLowerCase()

  // ── Plain text ──────────────────────────────────────────────
  if (mime.startsWith('text/') || ext === 'txt' || ext === 'md') {
    const text = await readAsText(file)
    if (!text.trim()) {
      const err: ImportError = { kind: 'empty' }
      throw err
    }
    return text
  }

  // ── PDF ─────────────────────────────────────────────────────
  if (mime === 'application/pdf' || ext === 'pdf') {
    try {
      const text = await extractPdfText(file)
      if (!text.trim()) {
        const err: ImportError = { kind: 'empty' }
        throw err
      }
      return text
    } catch (cause) {
      // Re-throw ImportError as-is, wrap everything else as parse_failed
      if (cause && typeof cause === 'object' && 'kind' in cause) throw cause
      const err: ImportError = { kind: 'parse_failed', cause }
      throw err
    }
  }

  const err: ImportError = { kind: 'unsupported_type', mime, ext }
  throw err
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsText(file, 'utf-8')
  })
}

async function extractPdfText(file: File): Promise<string> {
  // Lazy-load pdfjs-dist (pinned to v3.11.174). v4+ uses `import.meta.url`
  // for worker loading which Metro/Expo cannot transform; v3 ships a plain
  // UMD that bundles cleanly. Legacy build = ES2017, no modern syntax.
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf')

  // Worker config. We point pdfjs at a CDN URL that matches the installed
  // version — bundling the worker as a static asset is bundler-specific
  // and brittle. The PDF itself is never sent anywhere; only the worker
  // *code* is fetched once and cached by the browser.
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const version = pdfjs.version ?? '3.11.174'
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/pdf.worker.min.js`
  }

  const buffer = await file.arrayBuffer()
  const doc    = await pdfjs.getDocument({
    data: buffer,
    isEvalSupported: false,
  }).promise

  const out: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page    = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str ?? '').join(' ')
    out.push(pageText)
  }
  await doc.destroy?.()
  return out.join('\n\n')
}
