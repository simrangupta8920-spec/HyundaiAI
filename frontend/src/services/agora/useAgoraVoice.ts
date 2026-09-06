/**
 * useAgoraVoice.ts
 * React hook that owns the complete Agora voice lifecycle:
 *   - Requests microphone permission
 *   - Fetches an RTC token from the backend
 *   - Joins / leaves the Agora channel
 *   - Tracks connection state, mic status, speaking state, mute flag
 *   - Provides a mock mode (no real SDK calls) when mock_voice === true
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { IAgoraRTCClient, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
import type { AgoraConnectionState, AgoraVoiceState, MicrophoneStatus, SpeakingState } from './agoraTypes';
import {
  getAgoraTokenFromBackend,
  requestMicrophonePermission,
  createAgoraClient,
  joinChannel as sdkJoinChannel,
  leaveChannel as sdkLeaveChannel,
  muteLocalMic,
  unmuteLocalMic,
  enableVolumeIndicator,
} from './agoraClient';

// How loud (0-255) a user must be to be considered "speaking"
const SPEAKING_VOLUME_THRESHOLD = 20;

const INITIAL_STATE: AgoraVoiceState = {
  connectionState: 'disconnected',
  micStatus: 'inactive',
  speakingState: 'idle',
  isMuted: false,
  isMockMode: false,
  channelName: null,
  errorMessage: null,
};

export interface UseAgoraVoiceReturn {
  voiceState: AgoraVoiceState;
  joinChannel: () => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleMute: () => void;
}

export function useAgoraVoice(
  showroomId: string,
  sessionId: string,
): UseAgoraVoiceReturn {
  const [voiceState, setVoiceState] = useState<AgoraVoiceState>(INITIAL_STATE);

  // Persistent refs so callbacks always see the latest values
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<ILocalAudioTrack | null>(null);
  const isMockRef = useRef(false);
  const isMutedRef = useRef(false);

  // Convenience updater
  const patch = useCallback((partial: Partial<AgoraVoiceState>) => {
    setVoiceState((prev) => ({ ...prev, ...partial }));
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!isMockRef.current && clientRef.current) {
        sdkLeaveChannel(clientRef.current, micTrackRef.current).catch(() => {});
      }
    };
  }, []);

  // ── Mock mode helper ─────────────────────────────────────────────────────────
  const runMockJoin = useCallback(
    (channelName: string) => {
      patch({ connectionState: 'connecting', channelName, isMockMode: true });
      setTimeout(() => {
        patch({
          connectionState: 'connected',
          micStatus: 'active',
          speakingState: 'listening',
        });
      }, 800);
    },
    [patch],
  );

  // ── Join channel ─────────────────────────────────────────────────────────────
  const joinChannel = useCallback(async () => {
    if (voiceState.connectionState === 'connected' || voiceState.connectionState === 'connecting') {
      return;
    }

    patch({ connectionState: 'connecting', errorMessage: null });

    try {
      // 1. Fetch token from backend & resolve App ID
      const tokenData = await getAgoraTokenFromBackend(showroomId, sessionId);
      isMockRef.current = tokenData.mock_voice;

      const appId = import.meta.env.VITE_AGORA_APP_ID || tokenData.app_id;

      // Safe debugging (does not print secrets or actual keys)
      console.log({
        agoraConfigured: Boolean(import.meta.env.VITE_AGORA_APP_ID || tokenData.app_id),
        agoraAppIdLength: (import.meta.env.VITE_AGORA_APP_ID || tokenData.app_id)?.length,
      });

      // 2. Safe development check for missing App ID
      if (!tokenData.mock_voice && (!appId || appId.trim() === '' || appId === 'MOCK_AGORA_APP_ID')) {
        console.warn('Agora App ID is missing');
        patch({
          connectionState: 'error',
          errorMessage: 'Agora App ID is missing',
        });
        return;
      }

      // 3. Handle Mock Mode (if enabled)
      if (tokenData.mock_voice) {
        const hasMic = await requestMicrophonePermission();
        if (!hasMic) {
          patch({ connectionState: 'error', micStatus: 'permission_denied', errorMessage: 'Microphone access denied.' });
          return;
        }
        runMockJoin(tokenData.channel_name);
        return;
      }

      // 4. Initialize Agora RTC Client
      const client = createAgoraClient();
      clientRef.current = client;

      // Mirror Agora connection-state changes to our state
      client.on('connection-state-change', (curState: string) => {
        const stateMap: Record<string, AgoraConnectionState> = {
          DISCONNECTED: 'disconnected',
          CONNECTING: 'connecting',
          CONNECTED: 'connected',
          RECONNECTING: 'reconnecting',
          DISCONNECTING: 'disconnected',
        };
        patch({ connectionState: stateMap[curState] ?? 'disconnected' });
      });

      // Detect speaking via volume indicator
      client.on('volume-indicator', (volumes: Array<{ uid: number; level: number }>) => {
        const localVolume = volumes.find((v) => v.uid === tokenData.uid);
        const speakingState: SpeakingState =
          localVolume && localVolume.level > SPEAKING_VOLUME_THRESHOLD
            ? 'user_speaking'
            : 'listening';
        patch({ speakingState });
      });

      // 5. Request microphone permission ONLY AFTER Agora initialization & validation check
      const hasMic = await requestMicrophonePermission();
      if (!hasMic) {
        patch({ connectionState: 'error', micStatus: 'permission_denied', errorMessage: 'Microphone access denied.' });
        return;
      }

      // 6. Join channel and publish audio track
      const micTrack = await sdkJoinChannel(
        client,
        appId,
        tokenData.channel_name,
        tokenData.token,
        tokenData.uid,
      );
      micTrackRef.current = micTrack;
      enableVolumeIndicator(client);

      patch({
        connectionState: 'connected',
        micStatus: 'active',
        speakingState: 'listening',
        channelName: tokenData.channel_name,
        isMockMode: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Voice connection failed';
      patch({ connectionState: 'error', errorMessage: msg });
    }
  }, [showroomId, sessionId, voiceState.connectionState, patch, runMockJoin]);

  // ── Leave channel ────────────────────────────────────────────────────────────
  const leaveChannel = useCallback(async () => {
    if (isMockRef.current) {
      patch({
        connectionState: 'disconnected',
        micStatus: 'inactive',
        speakingState: 'idle',
        channelName: null,
      });
      return;
    }

    if (clientRef.current) {
      await sdkLeaveChannel(clientRef.current, micTrackRef.current);
      clientRef.current = null;
      micTrackRef.current = null;
    }

    patch({
      connectionState: 'disconnected',
      micStatus: 'inactive',
      speakingState: 'idle',
      isMuted: false,
      channelName: null,
    });
    isMutedRef.current = false;
  }, [patch]);

  // ── Toggle mute ──────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const nowMuted = !isMutedRef.current;
    isMutedRef.current = nowMuted;

    if (!isMockRef.current && micTrackRef.current) {
      if (nowMuted) muteLocalMic(micTrackRef.current);
      else unmuteLocalMic(micTrackRef.current);
    }

    const micStatus: MicrophoneStatus = nowMuted ? 'muted' : 'active';
    patch({ isMuted: nowMuted, micStatus });
  }, [patch]);

  return { voiceState, joinChannel, leaveChannel, toggleMute };
}
