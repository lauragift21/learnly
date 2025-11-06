import { useEffect, useState } from 'react';
import { RtkMeeting, registerAddons, type Meeting, type UIConfig} from '@cloudflare/realtimekit-react-ui';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { useNavigate, useParams } from 'react-router-dom';

type LeaveRoomState = 'disconnected' | 'connected-meeting' | 'left-breakout' | 'left-meeting' | string;

export default function Meeting() {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [customConfig, setCustomConfig] = useState<UIConfig | undefined>(undefined);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const searchParams = new URL(window.location.href).searchParams;
    let authToken: string | null = searchParams.get('authToken');

    if (!authToken && id) {
      try {
        authToken = sessionStorage.getItem(`rtk:token:${id}`);
      } catch {}
    }

    if (!authToken) {
      alert("Missing meeting token. Return to Home and start or join a session again.");
      navigate('/');
      return;
    }

    initMeeting({ authToken });
  }, [id, initMeeting, navigate]);

  useEffect(() => {
   
    async function addEffectsToggleControlBar() {
        const { default: RealtimeKitVideoBackground } = await import('@cloudflare/realtimekit-ui-addons/video-background');

        const videoBackground = await RealtimeKitVideoBackground.init({
          modes: ['blur', 'virtual', 'random'],
          blurStrength: 30,
          meeting,
          segmentationConfig: { pipeline: 'webgl2' },
          images: [
            'https://assets.dyte.io/backgrounds/bg_0.jpg',
            'https://assets.dyte.io/backgrounds/bg_1.jpg',
            'https://assets.dyte.io/backgrounds/bg_2.jpg',
          ],
          randomCount: 5,
        });

        const newConfig = registerAddons([videoBackground], meeting as Meeting);
        setCustomConfig(newConfig);
    }

    addEffectsToggleControlBar();
  }, [meeting]);

  // Redirect to Home when local user leaves the room
  useEffect(() => {
    if (!meeting?.self?.on || !meeting?.self?.off) return;

    const handler = ({ state }: { state: LeaveRoomState }) => {
      if (state === 'disconnected' || state === 'connected-meeting') return;
      navigate('/');
    };

    meeting.self.on('roomLeft', handler);
    return () => {
      meeting.self.off('roomLeft', handler);
    };
  }, [meeting, navigate]);

  // By default this component will cover the entire viewport.
  // To avoid that and to make it fill a parent container, pass the prop:
  // `mode="fill"` to the component.
  return (
    <div id="realtimekit-integration-wrapper" className="w-screen h-screen">
      <RtkMeeting meeting={meeting!} config={customConfig} />
    </div>
  );
}
