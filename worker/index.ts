const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init
  });

export default {
  async fetch(req: Request, env: Env) {
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

type CreateMeetingResponse = { id?: string; result?: { id?: string }; data?: { id?: string } };
type ErrorShape = unknown;

async function createMeeting(req: Request, env: Env) {
  const bodyIn = await safeJson(req);
  const title = (bodyIn.title as string) ?? "Class Session";
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
    let err: ErrorShape = null;
    try { err = await r.json(); } catch { err = null; }
    return json({ error: "Failed to create meeting", details: err }, { status: r.status });
  }
  const body = (await r.json()) as unknown as CreateMeetingResponse;
  const id = body.result?.id ?? body.data?.id ?? body.id;
  return json({ id, raw: body });
}

type IssueTokenResponse = { data?: { token?: string }; token?: string; auth_token?: string };

async function issueToken(req: Request, env: Env) {
  const input = await safeJson(req);
  const meetingId = input.meetingId as string | undefined;
  const userId = input.userId as string | undefined;
  const name = input.name as string | undefined;
  const presetName = input.presetName as string | undefined;
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
    let err: ErrorShape = null; try { err = await r.json(); } catch { err = null; }
    return json({ error: "Failed to issue token", details: err }, { status: r.status });
  }
  const body = (await r.json()) as unknown as IssueTokenResponse;
  const auth_token = body.data?.token ?? body.auth_token ?? body.token;
  return json({ auth_token, raw: body });
}

async function safeJson(req: Request): Promise<Record<string, unknown>> {
  try { return (await req.json()) as Record<string, unknown>; } catch { return {}; }
}

type PresetItem = { id?: string; name?: string; preset_id?: string };
type ListPresetsResponse = { result?: PresetItem[]; data?: PresetItem[] } | PresetItem[];

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
    let err: ErrorShape = null; try { err = await r.json(); } catch { err = null; }
    return json({ error: "Failed to list presets", details: err }, { status: r.status });
  }
  const body = (await r.json()) as unknown as ListPresetsResponse;
  const items = (Array.isArray(body) ? body : body.result ?? body.data) ?? [];
  const presets = Array.isArray(items)
    ? items.map((p) => ({ id: p.id ?? p.preset_id ?? p.name!, name: p.name ?? p.id! }))
    : [];
  return json({ presets, raw: body });
}
