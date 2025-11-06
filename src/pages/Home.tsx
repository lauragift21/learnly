import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function getAuthTokenFromResponse(data: any): string | undefined {
  return data?.auth_token || data?.result?.auth_token || data?.authToken || data?.result?.authToken;
}

function getMeetingIdFromResponse(data: any): string | undefined {
  return data?.id || data?.result?.id || data?.meeting_id || data?.result?.meeting_id;
}

export default function Home() {
  const [name, setName] = useState('');
  const [meetingCode, setMeetingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const cached = localStorage.getItem('learnly:name');
    if (cached) setName(cached);
  }, []);

  async function createNewMeeting() {
    setError(null);
    setLoading(true);

    try {
      const userId = crypto.randomUUID();
      const r = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Learnly class' })
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
        })
      });
      const tokenData = await r2.json();
      if (!r2.ok) throw new Error(tokenData?.error || 'Failed to issue token');
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
        })
      });
      const tokenData = await r.json();
      if (!r.ok) throw new Error(tokenData?.error || 'Failed to issue token');
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
          Connect, collaborate, and teach from anywhere with <span className="font-semibold">learnly</span> —
          a fast, secure video app built for modern classrooms.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={createNewMeeting}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white px-5 py-3 font-medium shadow-sm disabled:opacity-70"
          >
            <span>New meeting</span>
          </button>

          <div className="flex items-center rounded-2xl border border-slate-300 overflow-hidden">
            <span className="pl-3 pr-2 text-slate-500">⌗</span>
            <input
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              placeholder="Enter a code or nickname"
              className="px-3 py-3 w-72 outline-none"
            />
            <button
              onClick={joinWithCode}
              disabled={!meetingCode.trim() || loading}
              className="px-4 py-3 text-blue-600 font-medium disabled:text-slate-400"
            >
              Join
            </button>
          </div>
        </div>

        <div className="mt-10 w-full max-w-5xl border-t border-slate-200" />

        <div className="mt-6 grid gap-6 sm:grid-cols-2 w-full max-w-5xl text-left">
          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900">Host engaging lessons</h3>
            <p className="mt-1 text-slate-600 text-sm">Start a new class in seconds. Share the link and bring students together instantly.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900">Join with a class code</h3>
            <p className="mt-1 text-slate-600 text-sm">Enter a class code or nickname to jump into a live session securely.</p>
          </div>
        </div>

        {error && <div className="mt-6 text-red-600 text-sm">{error}</div>}

        <div className="mt-6 text-sm text-slate-500">Display name</div>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            localStorage.setItem('learnly:name', e.target.value);
          }}
          placeholder="Your display name"
          className="mt-1 px-3 py-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </main>
    </div>
  );
}
