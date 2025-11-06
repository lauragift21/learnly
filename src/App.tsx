import { useEffect } from 'react';
import { useRealtimeKitClient, RealtimeKitProvider, useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';

function App() {
  const [meeting, initMeeting] = useRealtimeKitClient();

  useEffect(() => {
    const searchParams = new URL(window.location.href).searchParams;

    const authToken = searchParams.get('authToken');
    const presetName = (import.meta as any).env?.VITE_RTK_PRESET_NAME || 'group-call-host';

    const bootstrap = async () => {
      try {
        let token = authToken || '';
        if (!token) {
          // 1) Create a meeting
          const createRes = await fetch('/api/meetings', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ title: 'Class session' })
          });
          if (!createRes.ok) throw new Error('Failed to create meeting');
          const createJson = await createRes.json();
          const meetingId = createJson?.data?.id;
          if (!meetingId) throw new Error('Missing meeting id');

          // 2) Issue token
          const userId = (self.crypto && 'randomUUID' in self.crypto) ? self.crypto.randomUUID() : `${Date.now()}`;
          const name = `Guest-${userId.slice(0, 6)}`;
          const tokenRes = await fetch('/api/tokens', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ meetingId, userId, name, presetName })
          });
          if (!tokenRes.ok) throw new Error('Failed to issue token');
          const tokenJson = await tokenRes.json();
          token = tokenJson?.data?.token;
          if (!token) throw new Error('Missing token in response');

          // 3) Update URL silently so refresh works
          const url = new URL(window.location.href);
          url.searchParams.set('authToken', token);
          window.history.replaceState({}, '', url.toString());
        }

        // 4) Initialize meeting
        initMeeting({
          authToken: token,
          defaults: {
            audio: false,
            video: false
          }
        });
      } catch (err) {
        console.error(err);
        alert('Failed to initialize meeting. Check console for details.');
      }
    };

    bootstrap();
  }, []);

  // By default this component will cover the entire viewport.
  // To avoid that and to make it fill a parent container, pass the prop:
  // `mode="fill"` to the component.
  return (
    <RealtimeKitProvider value={meeting}>
      <MyMeetingUI />
    </RealtimeKitProvider>
  )
}

function MyMeetingUI() {
  const { meeting } = useRealtimeKitMeeting();
  return (
    <div style={{ height: '480px' }}>
      <RtkMeeting meeting={meeting} showSetupScreen={false} />
    </div>
  );
}

export default App;