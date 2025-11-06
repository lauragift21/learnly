import { useEffect } from 'react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { useNavigate } from 'react-router-dom';

type LeaveRoomState = 'disconnected' | 'connected-meeting' | 'left-breakout' | 'left-meeting' | string;

export default function Meeting() {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URL(window.location.href).searchParams;
    const authToken = searchParams.get('authToken');

    if (!authToken) {
      alert(
        "An authToken wasn't passed, please pass an authToken in the URL query to join a meeting."
      );
      return;
    }

    initMeeting({ authToken });
  }, []);

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
    <div className="w-screen h-screen">
      <RtkMeeting meeting={meeting!} />
    </div>
  );
}
