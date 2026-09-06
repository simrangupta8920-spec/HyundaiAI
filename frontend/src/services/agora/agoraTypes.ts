export type AgoraConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type MicrophoneStatus = 'inactive' | 'active' | 'muted' | 'permission_denied';
export type SpeakingState = 'idle' | 'listening' | 'user_speaking' | 'ai_speaking';

export interface AgoraTokenResponse {
  app_id: string;
  channel_name: string;
  token: string;
  uid: number;
  showroom_id: string;
  session_id: string;
  conversation_id: string;
  mock_voice: boolean;
  expires_in: number;
}

export interface AgoraVoiceState {
  connectionState: AgoraConnectionState;
  micStatus: MicrophoneStatus;
  speakingState: SpeakingState;
  isMuted: boolean;
  isMockMode: boolean;
  channelName: string | null;
  errorMessage: string | null;
}
