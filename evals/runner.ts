/**
 * anoqi eval harness — runner
 *
 * Reads cases.jsonl, calls a /chat endpoint per case, scores each
 * response with scoring.ts, prints a Markdown report to stdout and
 * a one-line summary to stderr.
 *
 * Usage:
 *   ANOQI_EVAL_BASE_URL=https://anoqi-api-staging.marion-8c0.workers.dev \
 *     npx tsx evals/runner.ts
 *
 *   ANOQI_EVAL_BASE_URL=https://xulemxvfufwvewvtwwcv.supabase.co/functions/v1 \
 *   ANOQI_EVAL_SUPABASE_ANON_KEY=ey...  \
 *     npx tsx evals/runner.ts
 *
 * Exit code: 0 if all cases pass, 1 if any failed.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

import { scoreCase, type Expectations, type ChatResponseShape } from './scoring'

interface Case {
  id:           string
  description:  string
  message:      string
  language:     'fr' | 'en'
  journeyType:  string
  expectations: Expectations
}

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL = process.env.ANOQI_EVAL_BASE_URL
if (!BASE_URL) {
  console.error('ANOQI_EVAL_BASE_URL is required (e.g. https://anoqi-api-staging.marion-8c0.workers.dev)')
  process.exit(2)
}

const SUPABASE_ANON_KEY = process.env.ANOQI_EVAL_SUPABASE_ANON_KEY

// One sessionId for the whole run keeps things in one conversation thread.
// That's fine for v0 — assertions are per-turn, not per-conversation.
const SESSION_ID = `eval-${randomUUID()}`

async function callChat(c: Case): Promise<ChatResponseShape> {
  const url = `${BASE_URL.replace(/\/$/, '')}/chat`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (SUPABASE_ANON_KEY) {
    headers['apikey'] = SUPABASE_ANON_KEY
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message:     c.message,
      sessionId:   SESSION_ID,
      journeyType: c.journeyType,
      language:    c.language,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST /chat returned ${res.status}: ${text.slice(0, 300)}`)
  }
  return (await res.json()) as ChatResponseShape
}

function loadCases(): Case[] {
  const path = resolve(__dirname, 'cases.jsonl')
  const text = readFileSync(path, 'utf8')
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'))
    .map((l, i) => {
      try {
        return JSON.parse(l) as Case
      } catch (e) {
        throw new Error(`cases.jsonl line ${i + 1} is not valid JSON: ${(e as Error).message}`)
      }
    })
}

async function main() {
  const cases = loadCases()
  console.log(`# anoqi eval run`)
  console.log(``)
  console.log(`- base URL: ${BASE_URL}`)
  console.log(`- session:  ${SESSION_ID}`)
  console.log(`- cases:    ${cases.length}`)
  console.log(`- started:  ${new Date().toISOString()}`)
  console.log(``)
  console.log(`| id | result | note |`)
  console.log(`|---|---|---|`)

  let passed = 0
  let failed = 0
  const failureDetails: string[] = []

  for (const c of cases) {
    let line = `| ${c.id} | `
    try {
      const resp   = await callChat(c)
      const result = scoreCase(c.id, c.expectations, resp)
      if (result.passed) {
        passed++
        line += `✓ pass | ${c.description} |`
      } else {
        failed++
        const reasons = result.failures.map(f => `${f.key}: ${f.detail}`).join(' \\| ')
        line += `✗ FAIL | ${reasons} |`
        failureDetails.push(`### ${c.id}\n\n- description: ${c.description}\n- message: \`${c.message}\`\n- failures:\n${result.failures.map(f => `  - **${f.key}** — ${f.detail}`).join('\n')}\n`)
      }
    } catch (e) {
      failed++
      line += `⚠ ERROR | ${(e as Error).message} |`
      failureDetails.push(`### ${c.id}\n\n- description: ${c.description}\n- ERROR: ${(e as Error).message}\n`)
    }
    console.log(line)
  }

  console.log(``)
  console.log(`## summary`)
  console.log(``)
  console.log(`- passed: ${passed}`)
  console.log(`- failed: ${failed}`)
  console.log(`- finished: ${new Date().toISOString()}`)

  if (failureDetails.length > 0) {
    console.log(``)
    console.log(`## failure detail`)
    console.log(``)
    failureDetails.forEach(d => console.log(d))
  }

  console.error(`anoqi-eval: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(e => {
  console.error('Fatal error in runner:', e)
  process.exit(2)
})
