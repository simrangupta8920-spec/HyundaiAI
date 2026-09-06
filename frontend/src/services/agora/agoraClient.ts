/**
 * agoraClient.ts
 * Low-level Agora RTC wrapper.
 * All real SDK calls are isolated here; the rest of the app imports from this module only.
 * Mock implementations bypass real Agora calls when mock_voice === true.
 */

import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
  UID,
} from 'agora-rtc-sdk-ng';
import axios from 'axios';
import type { AgoraTokenResponse, AgoraAgentStartResponse } from './agoraTypes';

// --- Backend API base ---------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function getAgoraTokenFromBackend(
  showroomId: string,
  sessionId: string,
): Promise<AgoraTokenResponse> {
  const response = await axios.post<AgoraTokenResponse>(`${API_BASE}/api/agora/token`, {
    showroom_id: showroomId,
    session_id: sessionId,
  });
  return response.data;
}

/** Calls backend to start the Agora Conversational AI Agent for the given channel. */
export async function startConversationalAgent(
  channelName: string,
  sessionId: string,
): Promise<AgoraAgentStartResponse> {
  const response = await axios.post<AgoraAgentStartResponse>(
    `${API_BASE}/api/agora/conversational-agent/start`,
    { channel_name: channelName, session_id: sessionId },
  );
  return response.data;
}

/** Calls backend to stop a running Agora Conversational AI Agent. */
export async function stopConversationalAgent(agentId: string): Promise<void> {
  try {
    await axios.post(`${API_BASE}/api/agora/conversational-agent/stop`, { agent_id: agentId });
  } catch (err) {
    // Best-effort — don't throw if stop fails (session may have already ended)
    console.warn('[Agora] Agent stop request failed (non-fatal):', err);
  }
}

// --- Microphone permission ----------------------------------------------------
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

// --- Client factory -----------------------------------------------------------
export function createAgoraClient(): IAgoraRTCClient {
  return AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
}

// --- Join / leave ------------------------------------------------------------
/**
 * Joins an Agora channel and publishes a local microphone track.
 * Subscribes to & plays audio from remote AI participants automatically.
 */
export async function joinChannel(
  client: IAgoraRTCClient,
  appId: string,
  channelName: string,
  token: string,
  uid: UID,
  onRemoteAudioStateChange?: (isSpeaking: boolean) => void,
): Promise<ILocalAudioTrack> {
  // Listen for remote AI Conversational participant publishing audio
  client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    if (mediaType === 'audio') {
      await client.subscribe(user, 'audio');
      user.audioTrack?.play();
      console.log(`[Agora RTC] Subscribed to remote AI audio participant (${user.uid})`);
      if (onRemoteAudioStateChange) {
        onRemoteAudioStateChange(true);
      }
    }
  });

  client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    if (mediaType === 'audio') {
      console.log(`[Agora RTC] Remote audio participant (${user.uid}) stopped speaking`);
      if (onRemoteAudioStateChange) {
        onRemoteAudioStateChange(false);
      }
    }
  });

  client.on('user-left', (user: IAgoraRTCRemoteUser) => {
    console.log(`[Agora RTC] Remote participant (${user.uid}) left channel`);
    if (onRemoteAudioStateChange) {
      onRemoteAudioStateChange(false);
    }
  });

  await client.join(appId, channelName, token, uid);
  const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
  await client.publish([micTrack]);

  return micTrack;
}

export async function leaveChannel(
  client: IAgoraRTCClient,
  micTrack: ILocalAudioTrack | null,
): Promise<void> {
  if (micTrack) {
    micTrack.stop();
    micTrack.close();
    await client.unpublish([micTrack]);
  }
  await client.leave();
}

// --- Mute / unmute -----------------------------------------------------------
export function muteLocalMic(micTrack: ILocalAudioTrack): void {
  micTrack.setEnabled(false);
}

export function unmuteLocalMic(micTrack: ILocalAudioTrack): void {
  micTrack.setEnabled(true);
}

// --- Volume indicator --------------------------------------------------------
export function enableVolumeIndicator(client: IAgoraRTCClient): void {
  client.enableAudioVolumeIndicator();
}
