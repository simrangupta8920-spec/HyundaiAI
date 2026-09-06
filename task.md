# Agora Conversational AI Agent — Task List

- [x] 1. Update `backend/app/core/config.py` — add AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET, AGORA_PIPELINE_ID
- [x] 2. Update `backend/.env` — add real credentials
- [x] 3. Implement `agora_service.py` — real Agora Conversational AI API call (`/join` + `/leave`)
- [x] 4. Update `backend/app/routers/agora.py` — agent start/stop/status endpoints
- [x] 5. Update `frontend/src/services/agora/agoraTypes.ts` — add agent status fields
- [x] 6. Update `frontend/src/services/agora/useAgoraVoice.ts` — call agent start after RTC join, stop on leave
- [x] 7. Update `frontend/src/pages/VoiceAssistant.tsx` — add debug panel
- [x] 8. Run backend tests — 47/47 PASSING ✅
- [x] 9. Run frontend type check — 0 errors ✅
