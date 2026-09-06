/**
 * useAgoraVoice.ts
 * React hook that owns the complete Agora voice lifecycle:
 *   1. Fetches RTC token from backend
 *   2. Joins the Agora RTC channel (customer browser publishes mic)
 *   3. Starts the Agora Conversational AI Agent (backend calls Agora REST API)
 *      - Agent joins same channel as a remote participant
 *      - Agent does: Customer audio → ASR (Deepgram) → LLM (GPT-4.1-mini) → TTS (Minimax) → RTC
 *   4. Subscribes to and plays remote AI participant audio
 *   5. Tracks connection state, mic status, speaking state, agent status
 *   6. On leave: stops the agent, unpublishes mic, leaves channel
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { IAgoraRTCClient, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
import type {
  AgoraConnectionState,
  AgoraVoiceState,
  MicrophoneStatus,
  SpeakingState,
} from './agoraTypes';
import {
  getAgoraTokenFromBackend,
  startConversationalAgent,
  stopConversationalAgent,
  requestMicrophonePermission,
  createAgoraClient,
  joinChannel as sdkJoinChannel,
  leaveChannel as sdkLeaveChannel,
  muteLocalMic,
  unmuteLocalMic,
  enableVolumeIndicator,
} from './agoraClient';

const SPEAKING_VOLUME_THRESHOLD = 20;

const INITIAL_STATE: AgoraVoiceState = {
  connectionState: 'disconnected',
  micStatus: 'inactive',
  speakingState: 'idle',
  isMuted: false,
  isMockMode: false,
  channelName: null,
  errorMessage: null,
  agentStatus: 'inactive',
  agentId: null,
  remoteParticipants: 0,
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

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<ILocalAudioTrack | null>(null);
  const isMockRef = useRef(false);
  const isMutedRef = useRef(false);
  const agentIdRef = useRef<string | null>(null);
  const isJoiningRef = useRef(false);

  const patch = useCallback((partial: Partial<AgoraVoiceState>) => {
    setVoiceState((prev) => ({ ...prev, ...partial }));
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Stop agent if still running
      if (agentIdRef.current) {
        stopConversationalAgent(agentIdRef.current).catch(() => {});
        agentIdRef.current = null;
      }
      if (!isMockRef.current && clientRef.current) {
        sdkLeaveChannel(clientRef.current, micTrackRef.current).catch(() => {});
      }
    };
  }, []);

  // ── Mock mode helper ─────────────────────────────────────────────────────────
  const runMockJoin = useCallback(
    (channelName: string) => {
      patch({
        connectionState: 'connecting',
        channelName,
        isMockMode: true,
        agentStatus: 'starting',
      });
      setTimeout(() => {
        patch({
          connectionState: 'connected',
          micStatus: 'active',
          speakingState: 'listening',
          agentStatus: 'active',  // Mock agent "active"
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
    isJoiningRef.current = true;

    patch({ connectionState: 'connecting', errorMessage: null, agentStatus: 'inactive' });

    try {
      // Step 1 — Fetch RTC token from backend
      const tokenData = await getAgoraTokenFromBackend(showroomId, sessionId);
      isMockRef.current = tokenData.mock_voice;

      const appId = import.meta.env.VITE_AGORA_APP_ID || tokenData.app_id;

      console.log('[AgoraVoice]', {
        frameworkDetected: 'Vite + React (TypeScript)',
        agoraAppIdConfigured: Boolean(appId && appId !== 'MOCK_AGORA_APP_ID'),
        agoraAppIdLength: appId ? appId.trim().length : 0,
        tokenConfigured: Boolean(tokenData.token && tokenData.token.trim() !== ''),
        isMockMode: tokenData.mock_voice,
        channelName: tokenData.channel_name,
      });

      // Guard: missing App ID
      if (!tokenData.mock_voice && (!appId || appId.trim() === '' || appId === 'MOCK_AGORA_APP_ID')) {
        patch({
          connectionState: 'error',
          errorMessage: 'Agora App ID is missing. Set VITE_AGORA_APP_ID in your .env file.',
        });
        return;
      }

      // Step 2 — Mock mode shortcut
      if (tokenData.mock_voice) {
        const hasMic = await requestMicrophonePermission();
        if (!hasMic) {
          patch({ connectionState: 'error', micStatus: 'permission_denied', errorMessage: 'Microphone access denied.' });
          return;
        }
        runMockJoin(tokenData.channel_name);
        return;
      }

      // Step 3 — Initialize Agora RTC Client
      const client = createAgoraClient();
      clientRef.current = client;

      let remoteCount = 0;

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

      client.on('volume-indicator', (volumes: Array<{ uid: number; level: number }>) => {
        const localVolume = volumes.find((v) => v.uid === tokenData.uid);
        if (localVolume && localVolume.level > SPEAKING_VOLUME_THRESHOLD) {
          patch({ speakingState: 'user_speaking' });
        }
      });

      // Step 4 — Request microphone permission
      const hasMic = await requestMicrophonePermission();
      if (!hasMic) {
        patch({ connectionState: 'error', micStatus: 'permission_denied', errorMessage: 'Microphone access denied.' });
        return;
      }

      // Step 5 — Join channel and publish mic; wire remote AI audio subscription
      const micTrack = await sdkJoinChannel(
        client,
        appId,
        tokenData.channel_name,
        tokenData.token,
        tokenData.uid,
        (isRemoteSpeaking: boolean) => {
          patch({ speakingState: isRemoteSpeaking ? 'ai_speaking' : 'listening' });
        },
      );
      micTrackRef.current = micTrack;
      enableVolumeIndicator(client);

      // Track remote participant count
      client.on('user-joined', () => {
        remoteCount += 1;
        patch({ remoteParticipants: remoteCount });
      });
      client.on('user-left', () => {
        remoteCount = Math.max(0, remoteCount - 1);
        patch({ remoteParticipants: remoteCount, speakingState: 'listening' });
      });

      patch({
        connectionState: 'connected',
        micStatus: 'active',
        speakingState: 'listening',
        channelName: tokenData.channel_name,
        isMockMode: false,
        agentStatus: 'starting',
      });

      // Step 6 — Start the Agora Conversational AI Agent
      console.log('[AgoraVoice] Starting Conversational AI agent on channel:', tokenData.channel_name);
      try {
        const agentResult = await startConversationalAgent(tokenData.channel_name, sessionId);
        console.log('[AgoraVoice] Agent start response:', agentResult);

        if (agentResult.status === 'active' && agentResult.agent_id) {
          agentIdRef.current = agentResult.agent_id;
          patch({ agentStatus: 'active', agentId: agentResult.agent_id });
        } else if (agentResult.status === 'not_configured') {
          patch({ agentStatus: 'not_configured' });
          console.warn('[AgoraVoice] Conversational AI not configured:', agentResult.message);
        } else {
          patch({ agentStatus: 'error' });
          console.error('[AgoraVoice] Agent start error:', agentResult.error);
        }
      } catch (agentErr) {
        // Agent start failure is non-fatal — RTC still works for mic capture
        patch({ agentStatus: 'error' });
        console.error('[AgoraVoice] Agent start exception (non-fatal):', agentErr);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Voice connection failed';
      console.error('[AgoraVoice Error]:', msg);

      if (msg.includes('CAN_NOT_GET_GATEWAY_SERVER') || msg.includes('invalid vendor key')) {
        patch({
          connectionState: 'error',
          errorMessage: 'Invalid Agora App ID. Replace VITE_AGORA_APP_ID in .env with a real App ID from Agora Console.',
        });
      } else {
        patch({ connectionState: 'error', errorMessage: msg });
      }
    } finally {
      isJoiningRef.current = false;   // ADD THIS — always reset when the attempt finishes
    }
  }, [showroomId, sessionId, voiceState.connectionState, patch, runMockJoin]);

  // ── Leave channel ────────────────────────────────────────────────────────────
  const leaveChannel = useCallback(async () => {
    // Stop the Conversational AI agent first
    if (agentIdRef.current) {
      console.log('[AgoraVoice] Stopping Conversational AI agent:', agentIdRef.current);
      await stopConversationalAgent(agentIdRef.current);
      agentIdRef.current = null;
    }

    if (isMockRef.current) {
      patch({
        connectionState: 'disconnected',
        micStatus: 'inactive',
        speakingState: 'idle',
        channelName: null,
        agentStatus: 'stopped',
        agentId: null,
        remoteParticipants: 0,
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
      agentStatus: 'stopped',
      agentId: null,
      remoteParticipants: 0,
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
