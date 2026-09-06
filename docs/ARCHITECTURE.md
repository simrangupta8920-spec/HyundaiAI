# Architecture — AI Showroom Sales Executive

> Technical design document covering system components, data flow, LLM abstraction, and future integration points.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Diagram](#component-diagram)
3. [Customer Session Data Flow](#customer-session-data-flow)
4. [LLM Abstraction Layer](#llm-abstraction-layer)
5. [Database & File Schema Overview](#database--file-schema-overview)
6. [Lead Scoring Algorithm](#lead-scoring-algorithm)
7. [Negotiation Engine](#negotiation-engine)
8. [Escalation Pipeline](#escalation-pipeline)
9. [Security Considerations](#security-considerations)
10. [Future Agora Integration Points](#future-agora-integration-points)

---

## System Overview

The AI Showroom Sales Executive is a **two-tier, JSON-backed web application** designed to operate entirely on a local area network within a Hyundai showroom. No internet connectivity is required at runtime except for:

- LLM API calls (OpenAI / Gemini — can be swapped for a local model like Ollama in Phase 3)
- Agora RTC services (Phase 2 only)

The application is intentionally simple in Phase 1: a **React SPA kiosk UI** communicates with a **FastAPI backend** which reads from JSON flat files and calls an LLM for conversation intelligence.

---

## Component Diagram

```
╔══════════════════════════════════════════════════════════════════════╗
║                         KIOSK BROWSER                                ║
║                                                                      ║
║  ┌────────────────┐  ┌───────────────────┐  ┌──────────────────┐   ║
║  │  CarCatalogue  │  │    ChatPanel      │  │   LeadForm       │   ║
║  │  ┌──────────┐  │  │  ┌─────────────┐ │  │  ┌────────────┐  │   ║
║  │  │ CarCard  │  │  │  │MessageBubble│ │  │  │ Name/Phone │  │   ║
║  │  │ CarCard  │  │  │  │MessageBubble│ │  │  │ Budget     │  │   ║
║  │  │ CarCard  │  │  │  │ InputBox    │ │  │  │ Submit     │  │   ║
║  │  └──────────┘  │  │  └─────────────┘ │  │  └────────────┘  │   ║
║  └────────────────┘  └───────────────────┘  └──────────────────┘   ║
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │               Zustand Global Store                           │   ║
║  │  session_id | chat_history | active_car | lead | filters    │   ║
║  └─────────────────────────────────────────────────────────────┘   ║
║                                                                      ║
║  ┌──────────────────────────────────────────────────────────────┐  ║
║  │         VoiceAssistant.tsx  [STUB — Phase 2]                 │  ║
║  │         (Agora RTC hooks placeholder)                        │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
╚═════════════════════════════════╤════════════════════════════════════╝
                                  │ HTTP/REST (JSON)
                                  │ localhost:8000/api/v1
╔═════════════════════════════════▼════════════════════════════════════╗
║                         FASTAPI BACKEND                              ║
║                                                                      ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ║
║  │showroom  │ │  cars    │ │ convo    │ │  leads   │ │ scoring  │ ║
║  │ router   │ │ router   │ │ router   │ │ router   │ │ router   │ ║
║  └──────────┘ └──────────┘ └────┬─────┘ └──────────┘ └──────────┘ ║
║  ┌──────────┐ ┌──────────┐      │                                   ║
║  │negotiat. │ │escalation│      │                                   ║
║  │ router   │ │ router   │      │                                   ║
║  └──────────┘ └──────────┘      │                                   ║
║                                  ▼                                   ║
║  ┌──────────────────────────────────────────────────────────────┐  ║
║  │                    LLM Service (Abstraction)                  │  ║
║  │   llm_service.py — switches between OpenAI / Gemini          │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌──────────────────────────────────────────────────────────────┐  ║
║  │                  JSON File Store                              │  ║
║  │   cars.json  |  showroom.json  |  leads.json (runtime)       │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
╚═════════════════════════════════════════════════════════════════════╝
                     │                          │
                     ▼                          ▼
           ┌──────────────────┐     ┌────────────────────┐
           │  OpenAI API      │     │  Google Gemini API  │
           │  (gpt-4o)        │     │  (gemini-1.5-pro)  │
           └──────────────────┘     └────────────────────┘
```

---

## Customer Session Data Flow

The following diagram traces a complete customer journey from walk-up to human escalation:

```
  CUSTOMER                 KIOSK UI               BACKEND              LLM
     │                        │                      │                   │
     │  walks up to kiosk     │                      │                   │
     │──────────────────────► │                      │                   │
     │                        │  generate session_id │                   │
     │                        │  GET /showroom       │                   │
     │                        │─────────────────────►│                   │
     │                        │◄─────────────────────│                   │
     │                        │  display welcome     │                   │
     │◄───────────────────────│                      │                   │
     │                        │                      │                   │
     │  "I need a family SUV  │                      │                   │
     │   under 15 lakhs"      │                      │                   │
     │──────────────────────► │                      │                   │
     │                        │  POST /conversation  │                   │
     │                        │  /message            │                   │
     │                        │─────────────────────►│                   │
     │                        │                      │  build prompt     │
     │                        │                      │  (system + cars   │
     │                        │                      │   context + hist) │
     │                        │                      │──────────────────►│
     │                        │                      │◄──────────────────│
     │                        │                      │  parse actions    │
     │                        │◄─────────────────────│  (SHOW_CAR:10)    │
     │                        │  highlight Alcazar   │                   │
     │◄───────────────────────│                      │                   │
     │                        │                      │                   │
     │  "Can you do 14L?"     │                      │                   │
     │──────────────────────► │                      │                   │
     │                        │  POST /negotiation   │                   │
     │                        │  /offer              │                   │
     │                        │─────────────────────►│                   │
     │                        │                      │  apply discount   │
     │                        │                      │  logic (in-code)  │
     │                        │◄─────────────────────│                   │
     │  counter-offer shown   │                      │                   │
     │◄───────────────────────│                      │                   │
     │                        │                      │                   │
     │  "Yes, let's book!"    │                      │                   │
     │──────────────────────► │                      │                   │
     │                        │  POST /leads         │                   │
     │                        │─────────────────────►│ (save lead)       │
     │                        │  POST /leads/{id}    │                   │
     │                        │  /score              │                   │
     │                        │─────────────────────►│ (score=89, hot)   │
     │                        │  POST /escalation    │                   │
     │                        │  /notify             │                   │
     │                        │─────────────────────►│                   │
     │                        │                      │  alert Rajesh     │
     │  "Rajesh will be with  │                      │  Kumar            │
     │   you in 3 minutes"    │                      │                   │
     │◄───────────────────────│                      │                   │
```

---

## LLM Abstraction Layer

The `llm_service.py` module provides a **provider-agnostic interface** so the LLM backend can be swapped without changing any router code.

### Design

```python
# services/llm_service.py (conceptual)

class LLMService:
    def __init__(self, provider: str, model: str, api_key: str):
        self.provider = provider  # "openai" | "gemini" | "ollama"
        self.model = model
        self._client = self._init_client()

    def _init_client(self):
        if self.provider == "openai":
            return OpenAI(api_key=self.api_key)
        elif self.provider == "gemini":
            return genai.GenerativeModel(self.model)
        elif self.provider == "ollama":
            return OllamaClient(base_url="http://localhost:11434")

    async def chat(
        self,
        system_prompt: str,
        history: list[dict],
        user_message: str
    ) -> LLMResponse:
        """
        Normalised interface: always returns LLMResponse with
        .content (str) and .tokens_used (int).
        """
        ...
```

### System Prompt Strategy

The system prompt injected for every conversation turn includes:

1. **Role Definition** — "You are an AI Sales Executive at Hyundai Connaught Place..."
2. **Showroom Context** — Name, location, working hours, team names.
3. **Catalogue Snapshot** — All 14 models as a condensed JSON string (model, price range, body type, key features).
4. **Constraints** — Maximum discount %, no competitor mentions, escalation triggers.
5. **Output Format** — Instructed to always output valid JSON with `reply` + `actions[]`.

### Prompt Token Budget

| Component | Approx. Tokens |
|---|---|
| System prompt (static) | ~800 |
| Car catalogue context | ~1,200 |
| Conversation history (last 10 turns) | ~600 |
| User message | ~50 |
| **Total input** | **~2,650** |
| Response | ~300 |
| **Total per turn** | **~2,950** |

At GPT-4o pricing (~$5/M input tokens), cost per conversation turn ≈ **$0.015**. A full 20-turn session ≈ **$0.30**.

---

## Database & File Schema Overview

The MVP uses three JSON files as the data store. A future version should migrate `leads.json` to PostgreSQL or SQLite.

### `cars.json`

```
Array of CarModel:
  id              INTEGER  PRIMARY KEY
  model_name      TEXT
  variant         TEXT
  body_type       ENUM(SUV, Sedan, Hatchback, MPV)
  fuel_type       ENUM(Petrol, Diesel, Electric, CNG)
  transmission    ENUM(Manual, Automatic, DCT, CVT, iMT)
  price_min       FLOAT    (lakhs)
  price_max       FLOAT    (lakhs)
  mileage         TEXT
  engine_cc       INTEGER  (0 for EV)
  seating_capacity INTEGER
  colors          TEXT[]
  features        TEXT[]
  image_url       TEXT
  is_available    BOOLEAN
```

### `showroom.json`

```
ShowroomProfile:
  id              INTEGER  PRIMARY KEY
  name            TEXT
  location        TEXT
  phone           TEXT
  email           TEXT
  qr_code_url     TEXT
  logo_url        TEXT
  working_hours   TEXT
  sales_team      SalesAgent[]
    .name         TEXT
    .designation  TEXT
    .phone        TEXT
```

### `leads.json` (runtime-generated)

```
Array of Lead:
  lead_id           UUID     PRIMARY KEY
  session_id        UUID     FOREIGN KEY → conversation session
  name              TEXT
  phone             TEXT
  email             TEXT     NULLABLE
  interested_car_id INTEGER  NULLABLE → cars.id
  budget_min        FLOAT    NULLABLE
  budget_max        FLOAT    NULLABLE
  score             INTEGER  NULLABLE  (0–100, set after scoring)
  status            ENUM(new, qualified, hot, lost)
  notes             TEXT     NULLABLE
  created_at        DATETIME
  updated_at        DATETIME
```

---

## Lead Scoring Algorithm

Leads are scored on a **100-point scale** across four dimensions:

| Dimension | Max Points | Scoring Logic |
|---|---|---|
| **Budget Clarity** | 25 | Both min+max set = 25, one set = 15, none = 0 |
| **Model Interest** | 25 | Specific model identified = 25, body type only = 15, vague = 5 |
| **Engagement Depth** | 25 | >10 turns = 25, 6–10 = 18, 3–5 = 10, <3 = 5 |
| **Contact Completeness** | 25 | Phone+Email = 25, Phone only = 15, Email only = 10 |

**Status Classification:**

| Score | Status |
|---|---|
| 80–100 | `hot` |
| 55–79 | `qualified` |
| 30–54 | `new` |
| 0–29 | `lost` |

---

## Negotiation Engine

The negotiation module applies **rule-based discount logic** (no LLM needed for this step):

```
Max Allowed Discount:
  Grand i10 NIOS, Aura, Exter  →  5%
  i20, i20 N Line, Venue       →  4%
  Creta, Verna, Alcazar        →  3%
  Creta Electric, Ioniq 5      →  2%  (EV subsidies already applied)
  Tucson                       →  3%
  Stargazer                    →  4%

Counter-offer Strategy:
  1. If customer_offer >= (listed_price * 0.97):  ACCEPT outright
  2. If customer_offer >= (listed_price * 0.92):  Counter at midpoint + extras
  3. If customer_offer < (listed_price * 0.92):   Counter at max_discount + extras, flag for escalation
```

---

## Escalation Pipeline

Escalation is triggered by the AI when:

1. **Explicit Intent** — Customer says "book", "test drive", "ready to buy", "speak to someone".
2. **High Score** — Lead score ≥ 80 after lead capture.
3. **Negotiation Deadlock** — Customer rejects 3+ counter-offers.
4. **Out-of-Scope Query** — Legal, finance (loan), trade-in valuation questions.

In the MVP, escalation sends an **in-app notification** (console log / toast). Phase 2 will integrate SMS (Twilio) and a manager mobile PWA.

---

## Security Considerations

| Concern | MVP Mitigation | Future Hardening |
|---|---|---|
| LLM prompt injection | System prompt role pinning, JSON output enforcement | Input sanitisation, output schema validation |
| Lead data privacy | Local JSON only, no cloud sync | Encrypted SQLite, GDPR-compliant deletion |
| API key exposure | `.env` file, not committed to git | Secrets manager (HashiCorp Vault) |
| Admin endpoints | Bearer token (shared secret) | Per-user JWT, RBAC |
| Kiosk session isolation | Client-side UUID, no login | Browser kiosk mode, auto-reset on idle |

---

## Future Agora Integration Points

Phase 2 replaces the text `ChatPanel` with a **real-time voice channel** using Agora RTC + Agora Conversational AI.

### Backend Touch Points

| File | Change Needed |
|---|---|
| `backend/routers/conversation.py` | Add `GET /conversation/agora-token` endpoint |
| `backend/services/llm_service.py` | Expose streaming completion interface for Agora Conversational AI agent |
| `backend/.env` | Add `AGORA_APP_ID`, `AGORA_APP_CERT` |

### Frontend Touch Points

| File | Change Needed |
|---|---|
| `frontend/src/components/VoiceAssistant.tsx` | Implement Agora RTC join/leave, audio track publication |
| `frontend/src/App.tsx` | Conditional render: `ChatPanel` (text) vs `VoiceAssistant` (voice) |
| `frontend/package.json` | Add `agora-rtc-sdk-ng` dependency |

See **[AGORA_INTEGRATION.md](./AGORA_INTEGRATION.md)** for the complete step-by-step implementation guide.
