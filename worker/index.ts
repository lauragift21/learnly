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
  const accountId = (env as any).ACCOUNT_ID as string | undefined;
  const appId = (env as any).APP_ID as string | undefined;
  const apiToken = (env as any).CF_API_TOKEN as string | undefined;

  if (!accountId || !appId || !apiToken) {
    return json({ error: "Missing ACCOUNT_ID, APP_ID, or CF_API_TOKEN in environment" }, { status: 500 });
  }

  const payload: Record<string, unknown> = { title };
  if (preferredRegion) payload.preferred_region = preferredRegion;
  if (typeof recordOnStart === "boolean") payload.record_on_start = recordOnStart;

  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
  if (!r.ok) {
    let err: any = {};
    try { err = await r.json(); } catch {}
    return json({ error: "Failed to create meeting", details: err }, { status: r.status });
  }
  return json(await r.json());
}

async function issueToken(req: Request, env: Env) {
  const { meetingId, userId, name, presetName, picture } = await safeJson(req);
  if (!meetingId || !userId) return json({ error: "meetingId and userId required" }, { status: 400 });

  const accountId = (env as any).ACCOUNT_ID as string | undefined;
  const appId = (env as any).APP_ID as string | undefined;
  const apiToken = (env as any).CF_API_TOKEN as string | undefined;

  if (!accountId || !appId || !apiToken) {
    return json({ error: "Missing ACCOUNT_ID, APP_ID, or CF_API_TOKEN in environment" }, { status: 500 });
  }

  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings/${meetingId}/participants`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name,
        picture,
        preset_name: presetName,
        custom_participant_id: userId
      })
    }
  );

  if (!r.ok) {
    let err: any = {};
    try { err = await r.json(); } catch {}
    return json({ error: "Failed to issue token", details: err }, { status: r.status });
  }
  return json(await r.json()); // { auth_token, ... }
}

async function safeJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}
