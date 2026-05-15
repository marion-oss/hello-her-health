type RequestAccessPayload = {
  email?: unknown;
  name?:  unknown;
  phone?: unknown;
};

interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function corsPreflightResponse() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

function jsonResponse(
  body: unknown,
  init: Omit<ResponseInit, "headers"> & { headers?: Record<string, string> } = {},
) {
  const headers = new Headers({ ...CORS_HEADERS, ...init.headers });
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return corsPreflightResponse();
    }

    if (request.method !== "POST" || url.pathname !== "/api/request-access") {
      return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });
    }

    let payload: RequestAccessPayload;
    try {
      payload = (await request.json()) as RequestAccessPayload;
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const emailRaw = typeof payload.email === "string" ? payload.email : "";
    const email    = normalizeEmail(emailRaw);
    if (!email || !isValidEmail(email)) {
      return jsonResponse({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const name  = typeof payload.name  === "string" ? payload.name.trim()  || null : null;
    const phone = typeof payload.phone === "string" ? payload.phone.trim() || null : null;

    try {
      const existing = await env.DB.prepare(
        "SELECT id FROM waitlist WHERE email = ?",
      ).bind(email).first();

      if (existing) {
        // Update name/phone if provided on a repeat submission
        if (name || phone) {
          await env.DB.prepare(
            "UPDATE waitlist SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE email = ?",
          ).bind(name, phone, email).run();
        }
        return jsonResponse({ ok: true, status: "already_subscribed" });
      }

      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO waitlist (id, email, name, phone, created_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(
        id,
        email,
        name,
        phone,
        new Date().toISOString(),
        request.headers.get("user-agent") ?? null,
      ).run();

      return jsonResponse({ ok: true, status: "subscribed" });
    } catch (err) {
      return jsonResponse(
        { ok: false, error: "DB error", detail: String(err) },
        { status: 500 },
      );
    }
  },
};
