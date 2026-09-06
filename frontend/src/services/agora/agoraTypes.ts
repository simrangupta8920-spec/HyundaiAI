export type AgoraConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type MicrophoneStatus = 'inactive' | 'active' | 'muted' | 'permission_denied';
export type SpeakingState = 'idle' | 'listening' | 'user_speaking' | 'ai_speaking';
export type AgentStatus = 'inactive' | 'starting' | 'active' | 'error' | 'stopped' | 'not_configured';

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

export interface AgoraAgentStartResponse {
  status: string;         // 'active' | 'not_configured' | 'error'
  agent_id?: string;
  channel_name: string;
  session_id: string;
  agent_uid?: number;
  message?: string;
  error?: string;
}

export interface AgoraVoiceState {
  connectionState: AgoraConnectionState;
  micStatus: MicrophoneStatus;
  speakingState: SpeakingState;
  isMuted: boolean;
  isMockMode: boolean;
  channelName: string | null;
  errorMessage: string | null;
  // Conversational AI Agent
  agentStatus: AgentStatus;
  agentId: string | null;
  remoteParticipants: number;
}
