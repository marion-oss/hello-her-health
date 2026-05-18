# Anoqi eval harness (v0)

A minimal, deterministic regression harness for the `/chat` endpoint.

It exists because there's no other quality signal today — a corpus edit, a
prompt change, or a model upgrade could silently regress the user experience
and we'd find out from a user complaint, not CI. The cases below are
hand-authored assertions that the *current* product passes; future changes
that break them are regressions to investigate.

## What it does

For each case in `cases.jsonl`, the runner:

1. POSTs the message to a chat endpoint (Supabase Edge or CF Worker).
2. Reads the response (`content`, `sources`, `blocked`, etc.).
3. Asserts the configured `expectations` against that response.
4. Reports pass/fail with a one-line diff.

It is **not** an LLM-judge evaluator and doesn't do semantic similarity
scoring. Deterministic regex / set-membership assertions only — those catch
the regressions you can prove (refusals, citations, language, diagnosis
phrases). If you want softer "did the answer feel helpful?" scoring,
that's P3 (the Critic phase), not this harness.

## Case schema

Each line of `cases.jsonl` is a JSON object:

```json
{
  "id": "string — stable identifier, used in reports",
  "description": "string — one-line human summary",
  "message": "string — the user input sent to /chat",
  "language": "fr | en",
  "journeyType": "string — e.g. 'contraception', 'symptoms', 'free_chat'",
  "expectations": {
    "must_block": true | false,
    "must_be_language": "fr | en",
    "must_contain_any": ["regex", "regex"],
    "must_not_contain_any": ["regex", "regex"],
    "must_cite_source_kind_any_of": ["pathway", "source", "pathway_red_flag"],
    "min_citations": 1
  }
}
```

All `expectations.*` fields are optional. Omitted assertions are skipped.

## Running

The harness needs an authenticated chat endpoint reachable over HTTPS.
The simplest invocation goes through the staging CF Worker in anonymous
session mode (no JWT required):

```bash
ANOQI_EVAL_BASE_URL=https://anoqi-api-staging.marion-8c0.workers.dev \
  npx tsx evals/runner.ts
```

Against the Supabase Edge function instead:

```bash
ANOQI_EVAL_BASE_URL=https://xulemxvfufwvewvtwwcv.supabase.co/functions/v1 \
ANOQI_EVAL_SUPABASE_ANON_KEY=ey...  \
  npx tsx evals/runner.ts
```

(The Supabase function requires the `apikey` header even for anonymous calls.)

## Adding a case

1. Add a line to `cases.jsonl`. Keep IDs unique and human-readable
   (`refuse.prescribe.fr.001` is better than `case_42`).
2. Run the runner. Confirm the new case passes against the current product.
3. Commit. The case is now a regression test.

If the current product *fails* the assertion you want to add, that means
you've found a real gap — fix the product (or write a TODO) before
committing the case, so the harness baseline stays green.

## What v0 doesn't do

- No coverage of the document-upload or summary-generation paths.
- No assertions on response latency or token usage.
- No semantic ("did this answer the question") scoring.
- No retries on transient API errors — a failed case is just a fail.
- No parallel execution — cases run sequentially to keep API costs bounded
  and to make the report deterministic.
- No pilot/RAG-on path — cases run against the public posture
  (RAG-off by default). Add RAG-specific cases when the pilot allowlist
  has stable test UUIDs.

Each of these is a discrete follow-up; none belong in v0.
