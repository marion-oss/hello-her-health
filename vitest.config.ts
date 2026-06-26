import { defineConfig } from 'vitest/config'

// Vitest runs the pure-function tests under api/lib/ and api/policy/.
//
// retrieval.test.ts is intentionally NOT included: api/lib/retrieval.ts
// imports the Supabase client via a Deno-style URL (https://esm.sh/...),
// which Node/Vitest cannot resolve without a custom loader. When that
// surface is factored out (or the tests are rewritten to import from
// workers/be/src/lib/retrieval.ts, which uses the npm package), include
// it here.
//
// citationParser.test.ts is safe because its only retrieval reference is
// a type-only import that TypeScript strips at compile time.
//
// Frontend (app/, src/) tests are not included here — they need React-Native
// /jsdom setup which we'll add when frontend tests appear.

export default defineConfig({
  test: {
    include: [
      'api/lib/citationParser.test.ts',
      'api/lib/pseudonymise.test.ts',
      'api/functions/summaries.test.ts',
      'api/policy/policy.test.ts',
    ],
    environment: 'node',
    globals: false,
  },
})
