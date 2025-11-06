import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function getAuthTokenFromResponse(data: any): string | undefined {
  return (
    data?.auth_token ||
    data?.token ||
    data?.result?.auth_token ||
    data?.result?.token ||
    data?.authToken ||
    data?.result?.authToken
  );
}

function getMeetingIdFromResponse(data: any): string | undefined {
  return (
    data?.id ||
    data?.result?.id ||
    data?.data?.id ||
    data?.meeting_id ||
    data?.result?.meeting_id
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [meetingCode, setMeetingCode] = useState('');
  const [meetingName, setMeetingName] = useState('');
  const [createPreset, setCreatePreset] = useState('group_call_participant');
  const [showCreateAdvanced, setShowCreateAdvanced] = useState(false);
  const [presets, setPresets] = useState<{ id: string; name: string }[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const cached = localStorage.getItem('learnly:name');
    if (cached) setName(cached);
  }, []);

  // Load available presets for the Create Advanced selector
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setPresetsLoading(true);
        setPresetsError(null);
        const r = await fetch('/api/presets');
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load presets');
        if (ignore) return;
        const items: { id: string; name: string }[] = Array.isArray(data?.presets) ? data.presets : [];
        setPresets(items);
        // If a host preset exists, keep current selection; otherwise default safely to first available
        if (items.length && !items.find(p => p.name === createPreset)) {
          setCreatePreset(items[0].name);
        }
      } catch (e: any) {
        if (!ignore) setPresetsError(e?.message || 'Failed to load presets');
      } finally {
        if (!ignore) setPresetsLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  async function createNewMeeting() {
    setError(null);
    setLoading(true);

    try {
      const userId = crypto.randomUUID();
      const r = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: meetingName || 'Learnly class' })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed to create meeting');
      const targetMeetingId = getMeetingIdFromResponse(data);
      if (!targetMeetingId) throw new Error('Could not determine meeting id');

      const r2 = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          meetingId: targetMeetingId,
          userId,
          name: name || 'Guest',
          presetName: createPreset,
        })
      });
      const tokenData = await r2.json();
      console.log(tokenData);
      console.log(r2);
      if (!r2.ok) throw new Error(tokenData?.details?.error?.message || tokenData?.error || 'Failed to issue token');
      const authToken = getAuthTokenFromResponse(tokenData);
      if (!authToken) throw new Error('Could not obtain auth token');

      navigate(`/meeting?authToken=${encodeURIComponent(authToken)}`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function joinWithCode() {
    if (!meetingCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const userId = crypto.randomUUID();
      const r = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          meetingId: meetingCode.trim(),
          userId,
          name: name || 'Guest',
          presetName: 'group_call_participant',
        })
      });
      const tokenData = await r.json();
      if (!r.ok) throw new Error(tokenData?.details?.error?.message || tokenData?.error || 'Failed to issue token');
      const authToken = getAuthTokenFromResponse(tokenData);
      if (!authToken) throw new Error('Could not obtain auth token');
      navigate(`/meeting?authToken=${encodeURIComponent(authToken)}`);
    } catch (err: any) {
      setError(err?.message || 'Unable to join with that code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-white">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-slate-900" />
          <span className="font-bold text-lg tracking-tight">learnly</span>
        </div>
      </header>

      <main className="flex flex-col items-center text-center px-6 pt-10 pb-20">
        <h1 className="max-w-5xl text-4xl sm:text-6xl font-semibold leading-tight text-slate-900">
          Secure classroom video for everyone
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl">
          Teach, learn, and collaborate from anywhere with <span className="font-semibold">learnly</span> — built for modern classrooms.
        </p>

        <div className="mt-10 w-full max-w-xl text-left">
          <div className="flex gap-2 bg-slate-100 rounded-full p-1 w-fit mx-auto">
            <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-full text-sm ${activeTab==='create' ? 'bg-white shadow' : ''}`}>Create</button>
            <button onClick={() => setActiveTab('join')} className={`px-4 py-2 rounded-full text-sm ${activeTab==='join' ? 'bg-white shadow' : ''}`}>Join</button>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 p-6 shadow-sm">
            {activeTab === 'create' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600">Meeting name</label>
                  <input
                    value={meetingName}
                    onChange={(e) => setMeetingName(e.target.value)}
                    placeholder="What's your meeting about?"
                    className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600">Your name</label>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); localStorage.setItem('learnly:name', e.target.value); }}
                    placeholder="Your display name"
                    className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <button type="button" onClick={() => setShowCreateAdvanced(v => !v)} className="text-sm text-slate-600 underline">
                    Advanced
                  </button>
                  {showCreateAdvanced && (
                    <div className="mt-2 grid gap-2">
                      <label className="block text-sm text-slate-600">Preset</label>
                      {presetsLoading ? (
                        <div className="text-sm text-slate-500">Loading presets…</div>
                      ) : presetsError ? (
                        <div className="text-sm text-red-600">{presetsError}</div>
                      ) : (
                        <select
                          value={createPreset}
                          onChange={(e) => setCreatePreset(e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                          {presets.length > 0 ? (
                            presets.map(p => (
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))
                          ) : (
                            <>
                              <option value="group_call_participant">group_call_participant</option>
                              <option value="group_call_host">group_call_host</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>
                  )}
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <button onClick={createNewMeeting} disabled={loading} className="w-full rounded-lg bg-blue-600 text-white font-medium px-4 py-3 disabled:opacity-70">Start Meeting</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600">Meeting ID</label>
                  <input
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                    placeholder="Enter meeting ID"
                    className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600">Your name</label>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); localStorage.setItem('learnly:name', e.target.value); }}
                    placeholder="Your display name"
                    className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <button onClick={joinWithCode} disabled={!meetingCode.trim() || loading} className="w-full rounded-lg bg-slate-900 text-white font-medium px-4 py-3 disabled:opacity-50">Join Meeting</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
