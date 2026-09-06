# Agora RTC + Conversational AI Integration Guide

> **Status:** Planned — Phase 2  
> This document is a forward-looking implementation guide. The current MVP uses text-based chat. Follow this guide when upgrading to real-time voice.

---

## Table of Contents

1. [What is Agora Conversational AI?](#what-is-agora-conversational-ai)
2. [Architecture Change Summary](#architecture-change-summary)
3. [Required Packages](#required-packages)
4. [Step 1 — Agora Console Setup](#step-1--agora-console-setup)
5. [Step 2 — Backend: Token Generation Endpoint](#step-2--backend-token-generation-endpoint)
6. [Step 3 — Backend: conversation.py Changes](#step-3--backend-conversationpy-changes)
7. [Step 4 — Frontend: VoiceAssistant.tsx Implementation](#step-4--frontend-voiceassistanttsx-implementation)
8. [Step 5 — Frontend: App.tsx Integration](#step-5--frontend-apptsx-integration)
9. [Step 6 — Environment Variables](#step-6--environment-variables)
10. [Integration Checklist](#integration-checklist)
11. [Testing the Voice Flow](#testing-the-voice-flow)
12. [Known Limitations & Gotchas](#known-limitations--gotchas)

---

## What is Agora Conversational AI?

**Agora** is a real-time communication (RTC) platform that provides:

- **Agora RTC SDK** — Low-latency audio/video streaming between browser and Agora cloud.
- **Agora Conversational AI** — An Agora-hosted AI agent that joins an RTC channel, listens to the user's speech, calls an LLM, and responds with synthesised voice — all in sub-500ms end-to-end.

### How it works in our context

```
  Customer (Browser)                    Agora Cloud                   Our Backend
       │                                     │                              │
       │  1. Request Agora token             │                              │
       │────────────────────────────────────────────────────────────────►  │
       │◄───────────────────────────────────────────────────────────────── │
       │                                     │                              │
       │  2. Join RTC channel                │                              │
       │────────────────────────────────────►│                              │
       │                                     │                              │
       │  3. Speak into microphone           │                              │
       │────────────────────────────────────►│                              │
       │                            Agora STT │ transcribes speech          │
       │                                     │                              │
       │                                     │ 4. POST to our /conversation │
       │                                     │    /message endpoint         │
       │                                     │─────────────────────────────►│
       │                                     │◄─────────────────────────────│
       │                            Agora TTS │ synthesises reply            │
       │                                     │                              │
       │  5. Hear AI response via speaker    │                              │
       │◄────────────────────────────────────│                              │
```

### Benefits over the current text MVP

| Feature | Text MVP | Agora Voice |
|---|---|---|
| Input method | Keyboard typing | Natural speech |
| Response delivery | Text bubble | Synthesised voice |
| Latency | N/A | <500ms round-trip |
| Accessibility | Requires literacy | Voice-first |
| Engagement | Moderate | High (natural conversation) |

---

## Architecture Change Summary

```
BEFORE (MVP):
  Browser ChatPanel ──► POST /conversation/message ──► LLM ──► JSON response ──► render text

AFTER (Phase 2):
  Browser VoiceAssistant
    │── joins Agora RTC channel (audio only)
    │── Agora agent listens, transcribes (STT)
    │── Agora agent calls POST /conversation/message (Agora webhook)
    │── Backend replies with text
    │── Agora agent synthesises speech (TTS) and plays back
    └── Browser receives audio stream from Agora channel

  ChatPanel remains as a text transcript / fallback
```

---

## Required Packages

### Backend (Python)

```
# Add to requirements.txt
agora-token-builder==2.0.0     # Agora RTC token generation
python-dotenv>=1.0.0           # Already present
```

Install:
```powershell
pip install agora-token-builder
```

### Frontend (Node.js)

```bash
npm install agora-rtc-sdk-ng
# Optional: for UI feedback
npm install react-use-audio-level
```

> **Note:** `agora-rtc-sdk-ng` is the modern Web SDK. Do **not** use the deprecated `agora-rtc-sdk`.

---

## Step 1 — Agora Console Setup

1. Create an account at [console.agora.io](https://console.agora.io)
2. Create a new **Project** → Set authentication mode to **"Secure mode (TOKEN)"**
3. Copy your **App ID** and **App Certificate** into `.env`
4. Navigate to **Conversational AI** → Enable the extension
5. Configure:
   - **STT Language:** `en-IN` (English, India) — add `hi-IN` for Hindi support later
   - **TTS Voice:** `Microsoft Neerja Online (Natural)` or Agora's built-in `Female-Warm`
   - **LLM Webhook URL:** `https://your-backend-url.ngrok.io/api/v1/conversation/agora-webhook`
   - **System Prompt:** Same as your current LLM system prompt (configure in Agora Console or pass dynamically)
6. Note your **Conversational AI Agent UID** (the numeric ID Agora's bot joins the channel with)

---

## Step 2 — Backend: Token Generation Endpoint

Add a new router file `backend/routers/agora_token.py`:

```python
# backend/routers/agora_token.py

import time
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agora_token_builder import RtcTokenBuilder, RtcRole

router = APIRouter(prefix="/agora", tags=["Agora"])

AGORA_APP_ID = os.getenv("AGORA_APP_ID")
AGORA_APP_CERT = os.getenv("AGORA_APP_CERT")
TOKEN_EXPIRY_SECONDS = 3600  # 1 hour


class TokenRequest(BaseModel):
    channel_name: str      # Use session_id as channel name
    uid: int = 0           # 0 = Agora assigns a UID


class TokenResponse(BaseModel):
    token: str
    channel_name: str
    uid: int
    app_id: str
    expires_at: int        # Unix timestamp


@router.post("/token", response_model=TokenResponse)
async def generate_agora_token(request: TokenRequest):
    """
    Generate a short-lived Agora RTC token for a customer session.
    The channel_name should be the session UUID from the frontend.
    """
    if not AGORA_APP_ID or not AGORA_APP_CERT:
        raise HTTPException(status_code=500, detail="Agora credentials not configured.")

    expires_at = int(time.time()) + TOKEN_EXPIRY_SECONDS

    token = RtcTokenBuilder.buildTokenWithUid(
        appId=AGORA_APP_ID,
        appCertificate=AGORA_APP_CERT,
        channelName=request.channel_name,
        uid=request.uid,
        role=RtcRole.Role_Publisher,
        privilegeExpiredTs=expires_at
    )

    return TokenResponse(
        token=token,
        channel_name=request.channel_name,
        uid=request.uid,
        app_id=AGORA_APP_ID,
        expires_at=expires_at
    )
```

Register in `main.py`:

```python
# backend/main.py  (add this line)
from routers.agora_token import router as agora_router
app.include_router(agora_router, prefix="/api/v1")
```

---

## Step 3 — Backend: conversation.py Changes

Add an **Agora webhook handler** that Agora's Conversational AI calls when it needs an LLM response:

```python
# backend/routers/conversation.py  (add this endpoint)

from pydantic import BaseModel

class AgoraWebhookRequest(BaseModel):
    """
    Agora Conversational AI sends this payload when the user speaks.
    Exact schema depends on Agora's Conversational AI API version —
    check Agora docs for the current webhook contract.
    """
    session_id: str         # Maps to Agora channel_name
    transcript: str         # STT output: what the customer said
    turn_id: int            # Monotonically increasing turn counter
    metadata: dict = {}     # Extra Agora metadata


class AgoraWebhookResponse(BaseModel):
    reply: str              # Text for Agora TTS to speak
    # Agora ignores 'actions' — handle those via a separate SSE/WS channel to the browser


@router.post("/conversation/agora-webhook", response_model=AgoraWebhookResponse)
async def agora_conversation_webhook(request: AgoraWebhookRequest):
    """
    Webhook called by Agora Conversational AI on each user speech turn.
    1. Retrieve conversation history for this session.
    2. Call LLM service.
    3. Parse actions and push them to the browser via SSE (see /conversation/events).
    4. Return plain text reply for Agora to speak.
    """
    # 1. Load history from in-memory session store (Redis in production)
    history = session_store.get(request.session_id, [])

    # 2. Call LLM
    llm_response = await llm_service.chat(
        system_prompt=build_system_prompt(),
        history=history,
        user_message=request.transcript
    )

    # 3. Parse and push UI actions to browser via SSE
    parsed = parse_llm_response(llm_response.content)
    await push_actions_to_browser(request.session_id, parsed.actions)

    # 4. Update history
    history.append({"role": "user", "content": request.transcript})
    history.append({"role": "assistant", "content": parsed.reply})
    session_store[request.session_id] = history[-20:]  # Keep last 20 turns

    return AgoraWebhookResponse(reply=parsed.reply)


# SSE endpoint for browser to receive real-time UI actions
from fastapi.responses import StreamingResponse
import asyncio

action_queues: dict[str, asyncio.Queue] = {}

@router.get("/conversation/events/{session_id}")
async def conversation_events(session_id: str):
    """
    Server-Sent Events stream for the browser to receive UI actions
    pushed from the Agora webhook handler in real time.
    """
    queue = asyncio.Queue()
    action_queues[session_id] = queue

    async def event_generator():
        try:
            while True:
                action = await asyncio.wait_for(queue.get(), timeout=30)
                yield f"data: {action}\n\n"
        except asyncio.TimeoutError:
            yield "data: {\"type\": \"PING\"}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

## Step 4 — Frontend: VoiceAssistant.tsx Implementation

Replace the current stub with the full Agora RTC implementation:

```tsx
// frontend/src/components/VoiceAssistant.tsx

import { useEffect, useRef, useState } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { useAppStore } from "../store/useAppStore";
import { apiClient } from "../api/client";

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID as string;

export default function VoiceAssistant() {
  const { sessionId, addAction } = useAppStore();
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Subscribe to SSE for UI actions
  useEffect(() => {
    const es = new EventSource(
      `/api/v1/conversation/events/${sessionId}`
    );
    es.onmessage = (event) => {
      const action = JSON.parse(event.data);
      if (action.type !== "PING") addAction(action);
    };
    eventSourceRef.current = es;
    return () => es.close();
  }, [sessionId]);

  const joinChannel = async () => {
    // 1. Fetch Agora token from backend
    const { token, uid } = await apiClient.post("/agora/token", {
      channel_name: sessionId,
    });

    // 2. Create Agora client
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    // 3. Listen for remote audio (AI agent)
    client.on("user-published", async (user, mediaType) => {
      if (mediaType === "audio") {
        await client.subscribe(user, "audio");
        user.audioTrack?.play();
        setAgentSpeaking(true);
      }
    });
    client.on("user-unpublished", () => setAgentSpeaking(false));

    // 4. Join the channel
    await client.join(AGORA_APP_ID, sessionId, token, uid);

    // 5. Create and publish microphone track
    const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: "speech_standard",
      AEC: true,   // Acoustic Echo Cancellation
      ANS: true,   // Ambient Noise Suppression
      AGC: true,   // Auto Gain Control
    });
    micTrackRef.current = micTrack;
    await client.publish(micTrack);

    setIsJoined(true);
  };

  const leaveChannel = async () => {
    micTrackRef.current?.close();
    await clientRef.current?.leave();
    setIsJoined(false);
  };

  const toggleMute = () => {
    if (micTrackRef.current) {
      micTrackRef.current.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Avatar / Speaking Indicator */}
      <div
        className={`w-32 h-32 rounded-full border-4 flex items-center justify-center text-4xl transition-all
          ${agentSpeaking ? "border-blue-500 animate-pulse bg-blue-50" : "border-gray-200 bg-gray-50"}`}
      >
        🤖
      </div>
      <p className="text-sm text-gray-500">
        {agentSpeaking ? "AI is speaking..." : isJoined ? "Listening..." : "Press to start voice chat"}
      </p>

      {/* Controls */}
      <div className="flex gap-3">
        {!isJoined ? (
          <button
            onClick={joinChannel}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
          >
            🎙️ Start Voice Chat
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`px-4 py-2 rounded-full font-medium ${isMuted ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}
            >
              {isMuted ? "🔇 Unmute" : "🎙️ Mute"}
            </button>
            <button
              onClick={leaveChannel}
              className="px-4 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700"
            >
              ✖ End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Step 5 — Frontend: App.tsx Integration

Add a toggle between voice and text mode:

```tsx
// frontend/src/App.tsx  (relevant changes)

import { useState } from "react";
import ChatPanel from "./components/ChatPanel";
import VoiceAssistant from "./components/VoiceAssistant";

const VOICE_ENABLED = import.meta.env.VITE_VOICE_ENABLED === "true";

export default function App() {
  const [mode, setMode] = useState<"text" | "voice">("text");

  return (
    <div className="...">
      {/* Mode toggle (only show if voice is enabled in env) */}
      {VOICE_ENABLED && (
        <div className="flex gap-2 justify-center mb-4">
          <button
            onClick={() => setMode("text")}
            className={mode === "text" ? "btn-active" : "btn"}
          >
            💬 Text
          </button>
          <button
            onClick={() => setMode("voice")}
            className={mode === "voice" ? "btn-active" : "btn"}
          >
            🎙️ Voice
          </button>
        </div>
      )}

      {/* Conditionally render panel */}
      {mode === "text" || !VOICE_ENABLED ? (
        <ChatPanel />
      ) : (
        <VoiceAssistant />
      )}
    </div>
  );
}
```

---

## Step 6 — Environment Variables

### Backend `.env` additions

```env
# Agora Credentials
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERT=your_agora_app_certificate_here

# Agora Conversational AI
AGORA_AGENT_UID=12345          # The UID Agora's bot uses to join channels
AGORA_WEBHOOK_SECRET=optional  # Shared secret for webhook validation
```

### Frontend `.env` additions

```env
# Add to frontend/.env or frontend/.env.local
VITE_AGORA_APP_ID=your_agora_app_id_here
VITE_VOICE_ENABLED=true        # Set to false to disable voice mode in UI
```

> **Security:** `VITE_` prefix variables are embedded in the client-side bundle. Never put `AGORA_APP_CERT` in a Vite env variable — it must stay server-side only.

---

## Integration Checklist

Use this checklist when implementing Phase 2:

### Infrastructure
- [ ] Create Agora account and project at [console.agora.io](https://console.agora.io)
- [ ] Enable **Conversational AI** extension in Agora Console
- [ ] Configure STT language: `en-IN`
- [ ] Configure TTS voice and sample it
- [ ] Set webhook URL pointing to your backend (use ngrok for local dev)
- [ ] Copy `APP_ID` and `APP_CERT` to backend `.env`
- [ ] Copy `APP_ID` to frontend `.env`

### Backend
- [ ] `pip install agora-token-builder`
- [ ] Create `backend/routers/agora_token.py` (token endpoint)
- [ ] Add `/agora/token` router to `main.py`
- [ ] Add `POST /conversation/agora-webhook` to `conversation.py`
- [ ] Add `GET /conversation/events/{session_id}` SSE endpoint
- [ ] Add in-memory `session_store` (dict or Redis)
- [ ] Test token endpoint: `POST /api/v1/agora/token`
- [ ] Test webhook manually with curl: `POST /api/v1/conversation/agora-webhook`
- [ ] Validate Agora calls webhook correctly from Console test tool

### Frontend
- [ ] `npm install agora-rtc-sdk-ng`
- [ ] Implement `VoiceAssistant.tsx` (full code provided above)
- [ ] Add `VITE_AGORA_APP_ID` to frontend `.env`
- [ ] Add `VITE_VOICE_ENABLED=true` to frontend `.env`
- [ ] Update `App.tsx` with mode toggle
- [ ] Test microphone access in browser (requires HTTPS or localhost)
- [ ] Test joining channel and hearing AI audio
- [ ] Verify UI actions (SHOW_CAR, OPEN_LEAD_FORM) arrive via SSE and render correctly
- [ ] Test mute/unmute and leave channel

### QA
- [ ] Test full voice session: greeting → recommendation → negotiation → escalation
- [ ] Test echo cancellation (AEC) — no feedback loop
- [ ] Test on Chrome, Edge (primary kiosk browsers)
- [ ] Test with ambient showroom noise (noise suppression)
- [ ] Validate token expiry handling (auto-refresh if session > 1 hour)
- [ ] Load test: 2 concurrent kiosk sessions

---

## Testing the Voice Flow

### Local Development Setup

Since Agora requires a public webhook URL, use **ngrok** for local testing:

```powershell
# Install ngrok (one-time)
winget install ngrok

# Expose your local backend
ngrok http 8000

# Copy the HTTPS URL (e.g. https://abc123.ngrok.io) and set in Agora Console:
# Webhook URL: https://abc123.ngrok.io/api/v1/conversation/agora-webhook
```

### Manual Webhook Test

```powershell
curl -X POST http://localhost:8000/api/v1/conversation/agora-webhook `
  -H "Content-Type: application/json" `
  -d '{
    "session_id": "test-session-001",
    "transcript": "I want to see the Creta Electric",
    "turn_id": 1,
    "metadata": {}
  }'
```

Expected response:
```json
{
  "reply": "Excellent choice! The Creta Electric is our award-winning EV with a range of 631 km..."
}
```

---

## Known Limitations & Gotchas

| Issue | Mitigation |
|---|---|
| Agora requires HTTPS for microphone access | Use `localhost` for dev (browsers exempt localhost), or set up a self-signed cert for LAN |
| Agora Conversational AI has its own LLM configuration | Override with webhook mode so our backend stays the single LLM authority |
| SSE connection drops on mobile browsers | Implement reconnection with `EventSource` polyfill |
| Voice interruptions (user speaks while AI speaks) | Agora handles barge-in natively; ensure it's enabled in Console |
| Token expiry mid-session | Implement `AgoraRTCClient.renewToken()` call 5 minutes before expiry |
| AI agent UID collision | Pre-assign a fixed UID range (e.g. 1000–1999) to avoid collisions with human customers |
| India data residency | Choose Agora's Mumbai/Asia region in Console project settings |
