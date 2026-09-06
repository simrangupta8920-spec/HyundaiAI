# AI Showroom Sales Executive — MVP

> **An AI-powered, voice-first digital sales assistant for Hyundai showrooms.**  
> Greets walk-in customers, showcases the full car catalogue, qualifies leads, handles basic price negotiations, and escalates hot prospects to a live human sales executive — all in real time.

---

## Table of Contents

1. [Project Description](#project-description)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [Monorepo Structure](#monorepo-structure)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [API Documentation](#api-documentation)
8. [Current Status](#current-status)
9. [Roadmap](#roadmap)

---

## Project Description

The **AI Showroom Sales Executive** is a kiosk-style web application deployed inside a Hyundai showroom. A customer walks up, starts a voice conversation with the AI avatar, and is guided through the entire pre-purchase journey:

- 🚗 Browse and filter the 14-model Hyundai catalogue by budget, body type, fuel, seating, etc.
- 💬 Ask natural-language questions about specs, colours, features, and EMI estimates.
- 🤝 Receive personalised model recommendations based on stated needs.
- 💰 Explore pricing and negotiate within pre-approved discount bands.
- 📋 Capture contact details as a qualified lead.
- 🔔 Escalate to a human executive when the customer is ready to test-drive or book.

The MVP uses a **text-based chat UI** with a typed input, with a clear upgrade path to full Agora-powered real-time voice (see [AGORA_INTEGRATION.md](./AGORA_INTEGRATION.md)).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Kiosk)                    │
│  React + Vite + TailwindCSS + shadcn/ui              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ CarCatalogue│  │  ChatPanel   │  │  LeadForm   │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ REST / JSON
┌──────────────────────▼──────────────────────────────┐
│              FastAPI Backend (Python 3.11)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ /cars    │ │ /convo   │ │ /leads   │ │/negot. │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│         ┌──────────────────────────────────┐         │
│         │   LLM Service (OpenAI / Gemini)  │         │
│         └──────────────────────────────────┘         │
│         ┌──────────────────────────────────┐         │
│         │   JSON File Store (cars.json,    │         │
│         │   showroom.json, leads.json)     │         │
│         └──────────────────────────────────┘         │
└─────────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a deeper breakdown.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite 5 | SPA kiosk UI |
| **Styling** | TailwindCSS v3 + shadcn/ui | Component library |
| **State** | Zustand | Global client state |
| **Backend** | FastAPI (Python 3.11) | REST API server |
| **LLM** | OpenAI GPT-4o / Google Gemini | Conversation intelligence |
| **Data Store** | JSON flat files (MVP) | Car catalogue, leads |
| **Voice (future)** | Agora RTC SDK + Conversational AI | Real-time voice avatar |
| **Deployment** | Local LAN / Kiosk mode | On-premises showroom |

---

## Monorepo Structure

```
f:/AI/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment variable template
│   ├── routers/
│   │   ├── showroom.py          # GET /showroom
│   │   ├── cars.py              # GET /cars, GET /cars/{id}
│   │   ├── conversation.py      # POST /conversation/message
│   │   ├── leads.py             # POST /leads, GET /leads
│   │   ├── scoring.py           # POST /leads/{id}/score
│   │   ├── negotiation.py       # POST /negotiation/offer
│   │   └── escalation.py        # POST /escalation/notify
│   ├── services/
│   │   ├── llm_service.py       # LLM abstraction layer
│   │   ├── car_service.py       # Car catalogue business logic
│   │   └── lead_service.py      # Lead management logic
│   └── data/                    # Symlink → f:/AI/data/
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── CarCard.tsx
│   │   │   ├── CarCatalogue.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── LeadForm.tsx
│   │   │   ├── NegotiationPanel.tsx
│   │   │   ├── EscalationAlert.tsx
│   │   │   └── VoiceAssistant.tsx   # Stub — Agora hook placeholder
│   │   ├── store/
│   │   │   └── useAppStore.ts
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── types/
│   │       └── index.ts
│
├── data/
│   ├── cars.json                # 14 Hyundai model definitions
│   ├── showroom.json            # Showroom & sales team info
│   └── leads.json               # Runtime-generated lead records
│
└── docs/
    ├── README.md                # ← You are here
    ├── API.md                   # Full REST API reference
    ├── ARCHITECTURE.md          # System design & data flow
    └── AGORA_INTEGRATION.md     # Future voice integration guide
```

---

## Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| Python | ≥ 3.11 |
| Node.js | ≥ 20 LTS |
| npm | ≥ 10 |
| Git | any recent |

You will also need an **OpenAI API key** (or Gemini API key) configured in `.env`.

---

### Backend Setup

```powershell
# 1. Navigate to the backend directory
cd f:/AI/backend

# 2. Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy the environment template and fill in your keys
Copy-Item .env.example .env
notepad .env

# 5. Start the FastAPI development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

### Frontend Setup

```powershell
# 1. Navigate to the frontend directory
cd f:/AI/frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite dev server
npm run dev
```

The UI will be available at: `http://localhost:3000`

---

## Environment Variables

Create `f:/AI/backend/.env` based on `.env.example`:

| Variable | Required | Description | Example |
|---|---|---|---|
| `LLM_PROVIDER` | ✅ | LLM backend to use | `openai` or `gemini` |
| `OPENAI_API_KEY` | ✅ (if OpenAI) | OpenAI secret key | `sk-...` |
| `GEMINI_API_KEY` | ✅ (if Gemini) | Google Gemini API key | `AIza...` |
| `LLM_MODEL` | ❌ | Specific model name | `gpt-4o` |
| `DATA_DIR` | ❌ | Path to data folder | `../data` |
| `LEADS_FILE` | ❌ | Lead storage file | `../data/leads.json` |
| `CORS_ORIGINS` | ❌ | Allowed CORS origins | `http://localhost:3000` |
| `SECRET_KEY` | ✅ | JWT signing secret | `your-secret-here` |
| `AGORA_APP_ID` | ❌ | Agora App ID (future) | `abc123...` |
| `AGORA_APP_CERT` | ❌ | Agora App Certificate (future) | `xyz789...` |

---

## API Documentation

Full REST API reference with request/response schemas and examples:

📄 **[API.md](./API.md)**

Covers all 7 modules:
- `GET /showroom` — Showroom details
- `GET /cars` — Car catalogue (with filters)
- `POST /conversation/message` — Chat message exchange
- `POST /leads` — Create a new lead
- `POST /leads/{id}/score` — Score/update a lead
- `POST /negotiation/offer` — Handle price negotiation
- `POST /escalation/notify` — Trigger human escalation

---

## Current Status

> **MVP — Phase 1 (Text Chat)**

| Feature | Status |
|---|---|
| Car catalogue (14 models) | ✅ Complete |
| Showroom data | ✅ Complete |
| FastAPI backend skeleton | 🔧 In Progress |
| Chat UI (text-based) | 🔧 In Progress |
| LLM conversation engine | 🔧 In Progress |
| Lead capture & scoring | 🔧 In Progress |
| Price negotiation logic | 🔧 In Progress |
| Escalation to human | 🔧 In Progress |
| Voice (Agora RTC) | ⏳ Planned (Phase 2) |
| Analytics dashboard | ⏳ Planned (Phase 3) |
| CRM integration | ⏳ Planned (Phase 3) |

---

## Roadmap

### Phase 1 — MVP (Current)
- Text-based chat interface
- LLM-powered Q&A on car catalogue
- Lead capture form
- Basic price negotiation within discount bands
- Human escalation alerts

### Phase 2 — Voice Avatar
- Agora RTC SDK integration
- Real-time voice conversation with AI
- Lip-synced avatar display
- Push-to-talk and always-on modes
- See [AGORA_INTEGRATION.md](./AGORA_INTEGRATION.md)

### Phase 3 — Intelligence & CRM
- Lead scoring ML model
- Integration with Hyundai HDMS/CRM
- Multi-language support (Hindi, Tamil, Telugu, etc.)
- Analytics dashboard (session counts, conversion rate, popular models)
- A/B testing for conversation scripts

### Phase 4 — Multi-Showroom
- Central management console
- Per-showroom configuration
- Fleet-wide lead aggregation
- Manager mobile app for real-time escalation
