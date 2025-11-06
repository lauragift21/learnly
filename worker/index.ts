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

    if (url.pathname === "/api/presets" && req.method === "GET")
      return listPresets(env);

    // Everything else: serve the React build
    // In create-cloudflare, your static assets are exposed via env.ASSETS
    // and the entry HTML is auto-handled.
    return env.ASSETS.fetch(req);
  }
};

async function createMeeting(req: Request, env: Env) {
  const { title = "Class Session" } = await safeJson(req);
  const accountId = env.ACCOUNT_ID;
  const appId = env.APP_ID;
  const apiToken = env.CF_API_TOKEN;

  if (!accountId || !appId || !apiToken) {
    return json({ error: "Missing ACCOUNT_ID, APP_ID, or CF_API_TOKEN in environment" }, { status: 500 });
  }

  const payload: Record<string, unknown> = { title };
  // If you want to support more options later, uncomment:
  // if (preferredRegion) payload.preferred_region = preferredRegion;
  // if (typeof recordOnStart === "boolean") payload.record_on_start = recordOnStart;

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
  const body = await r.json();
  const id = (body as any)?.result?.id ?? (body as any)?.data?.id ?? (body as any)?.id;
  return json({ id, raw: body });
}

async function issueToken(req: Request, env: Env) {
  const { meetingId, userId, name, presetName } = await safeJson(req);
  if (!meetingId || !userId) return json({ error: "meetingId and userId required" }, { status: 400 });

  const accountId = env.ACCOUNT_ID;
  const appId = env.APP_ID;
  const apiToken = env.CF_API_TOKEN;

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
  const body = await r.json();
  const auth_token = (body as any)?.data?.token;
  return json({ auth_token, raw: body });
}

async function safeJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

async function listPresets(env: Env) {
  const accountId = env.ACCOUNT_ID;
  const appId = env.APP_ID;
  const apiToken = env.CF_API_TOKEN;

  if (!accountId || !appId || !apiToken) {
    return json({ error: "Missing ACCOUNT_ID, APP_ID, or CF_API_TOKEN in environment" }, { status: 500 });
  }

  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/presets`,
    {
      headers: { authorization: `Bearer ${apiToken}` },
    }
  );
  if (!r.ok) {
    let err: any = {}; try { err = await r.json(); } catch {}
    return json({ error: "Failed to list presets", details: err }, { status: r.status });
  }
  const body = await r.json();
  const items = (body as any)?.result ?? (body as any)?.data ?? body;
  const presets = Array.isArray(items)
    ? items.map((p: any) => ({ id: p.id ?? p.preset_id ?? p.name, name: p.name ?? p.id }))
    : [];
  return json({ presets, raw: body });
}
