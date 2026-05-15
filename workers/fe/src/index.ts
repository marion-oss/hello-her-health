/**
 * anoqi — frontend Worker entry
 *
 * Serves the Expo web build via Cloudflare Static Assets. The `[assets]`
 * block in wrangler.toml does the heavy lifting — this fetch handler is
 * the fallback that Static Assets calls if no asset matches.
 *
 * With `not_found_handling = "single-page-application"`, Static Assets
 * already serves /index.html for unmatched paths, so this handler is
 * mostly a no-op. Kept here so we have a place to add future logic
 * (custom headers, geo-routing, etc.) without restructuring.
 */
type Env = {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
