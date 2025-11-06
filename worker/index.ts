interface Env {
  ASSETS: Fetcher;
  REALTIMEKIT_ORG_ID: string;
  REALTIMEKIT_API_KEY: string;
}

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init
  });

export default {
  async fetch(req: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(req.url);

    // APIs
    if (url.pathname === "/api/meetings" && req.method === "POST")
      return createMeeting(req, env);

    if (url.pathname === "/api/tokens" && req.method === "POST")
      return issueToken(req, env);

    // Everything else: serve the React build
    // In create-cloudflare, your static assets are exposed via env.ASSETS
    // and the entry HTML is auto-handled.
    return env.ASSETS.fetch(req);
  }
};

async function createMeeting(req: Request, env: Env) {
  const { title = "Class session", preferredRegion, recordOnStart } = await safeJson(req);
  const authHeader = `Basic ${btoa(`${env.REALTIMEKIT_ORG_ID}:${env.REALTIMEKIT_API_KEY}`)}`;
  const payload: Record<string, unknown> = { title };
  if (preferredRegion) payload.preferred_region = preferredRegion;
  if (typeof recordOnStart === "boolean") payload.record_on_start = recordOnStart;

  const r = await fetch(
    "https://api.realtime.cloudflare.com/v2/meetings",
    {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
  if (!r.ok) return json({ error: "Failed to create meeting" }, { status: 500 });
  return json(await r.json());
}

async function issueToken(req: Request, env: Env) {
  const { meetingId, userId, name, presetName, picture } = await safeJson(req);
  if (!meetingId || !userId) return json({ error: "meetingId and userId required" }, { status: 400 });

  const authHeader = `Basic ${btoa(`${env.REALTIMEKIT_ORG_ID}:${env.REALTIMEKIT_API_KEY}`)}`;

  const r = await fetch(
    `https://api.realtime.cloudflare.com/v2/meetings/${meetingId}/participants`,
    {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json"
      },
      body: JSON.stringify({ name, picture, preset_name: presetName, client_specific_id: userId })
    }
  );

  if (!r.ok) return json({ error: "Failed to issue token" }, { status: 500 });
  return json(await r.json()); // { auth_token, ... }
}

async function safeJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}
