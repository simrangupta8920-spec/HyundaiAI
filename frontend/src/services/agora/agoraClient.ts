/**
 * agoraClient.ts
 * Low-level Agora RTC wrapper.
 * All real SDK calls are isolated here; the rest of the app imports from this module only.
 * Mock implementations bypass real Agora calls when mock_voice === true.
 */

import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  UID,
} from 'agora-rtc-sdk-ng';
import axios from 'axios';
import type { AgoraTokenResponse } from './agoraTypes';

// --- Backend token endpoint ---------------------------------------------------
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
 * Returns the mic track so callers can mute/unmute it later.
 */
export async function joinChannel(
  client: IAgoraRTCClient,
  appId: string,
  channelName: string,
  token: string,
  uid: UID,
): Promise<ILocalAudioTrack> {
  await client.join(appId, channelName, token, uid);
  const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
  await client.publish([micTrack]);

  // TODO: Listen for Agora Conversational AI agent joining the channel.
  // Configure the AI agent in the Agora Console / via REST and wire up:
  // client.on('user-published', async (user, mediaType) => {
  //   if (mediaType === 'audio') {
  //     await client.subscribe(user, 'audio');
  //     user.audioTrack?.play();
  //   }
  // });

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
/**
 * Enable the volume-indicator event (fires every ~200 ms).
 * Call once after joining so the hook can detect speaking activity.
 */
export function enableVolumeIndicator(client: IAgoraRTCClient): void {
  // enableAudioVolumeIndicator emits 'volume-indicator' events every 2 seconds by default.
  // Adjust interval via Agora Console or the RTC engine config if needed.
  client.enableAudioVolumeIndicator();
}
