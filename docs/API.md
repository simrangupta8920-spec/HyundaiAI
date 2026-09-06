# API Reference — AI Showroom Sales Executive

> **Base URL:** `http://localhost:8000/api/v1`  
> **Format:** All requests and responses use `application/json`.  
> **Authentication:** Protected endpoints require a `Bearer` token in the `Authorization` header (see [Authentication](#authentication)).

---

## Table of Contents

1. [Authentication](#authentication)
2. [Module: Showroom](#module-showroom)
3. [Module: Cars](#module-cars)
4. [Module: Conversation](#module-conversation)
5. [Module: Leads](#module-leads)
6. [Module: Scoring](#module-scoring)
7. [Module: Negotiation](#module-negotiation)
8. [Module: Escalation](#module-escalation)
9. [Error Responses](#error-responses)

---

## Authentication

The MVP uses a lightweight **API key** scheme for protected endpoints (admin operations). Public-facing endpoints (used by the kiosk UI) are open.

**Header format:**
```
Authorization: Bearer <your-secret-key>
```

Endpoints marked with 🔒 require this header. Endpoints marked with 🌐 are publicly accessible.

---

## Module: Showroom

### `GET /showroom` 🌐

Returns the showroom profile including name, location, contact information, working hours, and sales team.

**Request:** No body required.

**Response Schema:**

```json
{
  "id": number,
  "name": string,
  "location": string,
  "phone": string,
  "email": string,
  "qr_code_url": string,
  "logo_url": string,
  "working_hours": string,
  "sales_team": [
    {
      "name": string,
      "designation": string,
      "phone": string
    }
  ]
}
```

**Example Response:**

```json
{
  "id": 1,
  "name": "Hyundai Connaught Place",
  "location": "N-1, Connaught Circus, Connaught Place, New Delhi - 110001",
  "phone": "+91-11-4567-8900",
  "email": "cp@hyundai-delhi.com",
  "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://localhost:3000",
  "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Hyundai_logo_2.svg/320px-Hyundai_logo_2.svg.png",
  "working_hours": "Mon-Sat: 9:00 AM – 7:00 PM, Sun: 10:00 AM – 5:00 PM",
  "sales_team": [
    { "name": "Rajesh Kumar", "designation": "Senior Sales Executive", "phone": "+91-98765-43210" },
    { "name": "Priya Sharma", "designation": "Sales Executive", "phone": "+91-98765-43211" },
    { "name": "Amit Singh", "designation": "Sales Manager", "phone": "+91-98765-43212" }
  ]
}
```

---

## Module: Cars

### `GET /cars` 🌐

Returns the full car catalogue with optional query filters.

**Query Parameters:**

| Parameter | Type | Description | Example |
|---|---|---|---|
| `body_type` | string | Filter by body type | `SUV`, `Sedan`, `Hatchback`, `MPV` |
| `fuel_type` | string | Filter by fuel type | `Petrol`, `Diesel`, `Electric`, `CNG` |
| `transmission` | string | Filter by transmission | `Manual`, `Automatic`, `DCT`, `CVT`, `iMT` |
| `min_price` | float | Minimum price in lakhs | `10.0` |
| `max_price` | float | Maximum price in lakhs | `20.0` |
| `seating` | integer | Minimum seating capacity | `7` |
| `available_only` | boolean | Only available cars | `true` |

**Response Schema:**

```json
{
  "count": number,
  "results": [ <Car Object>, ... ]
}
```

**Car Object:**

```json
{
  "id": number,
  "model_name": string,
  "variant": string,
  "body_type": "SUV" | "Sedan" | "Hatchback" | "MPV",
  "fuel_type": "Petrol" | "Diesel" | "Electric" | "CNG",
  "transmission": "Manual" | "Automatic" | "DCT" | "CVT" | "iMT",
  "price_min": number,
  "price_max": number,
  "mileage": string,
  "engine_cc": number,
  "seating_capacity": number,
  "colors": [string],
  "features": [string],
  "image_url": string,
  "is_available": boolean
}
```

**Example Request:**

```
GET /api/v1/cars?body_type=SUV&max_price=15&fuel_type=Petrol
```

**Example Response:**

```json
{
  "count": 3,
  "results": [
    {
      "id": 4,
      "model_name": "Exter",
      "variant": "S AMT Knight",
      "body_type": "SUV",
      "fuel_type": "Petrol",
      "transmission": "Automatic",
      "price_min": 6.0,
      "price_max": 10.5,
      "mileage": "19.4 kmpl",
      "engine_cc": 1197,
      "seating_capacity": 5,
      "colors": ["Atlas White", "Typhoon Silver", "Fiery Red", "Ranger Khaki", "Abyss Black Pearl"],
      "features": ["8-inch Touchscreen Infotainment", "BlueLink Connected Car", "..."],
      "image_url": "https://picsum.photos/seed/Exter/600/400",
      "is_available": true
    }
  ]
}
```

---

### `GET /cars/{id}` 🌐

Returns full details for a single car by its numeric ID.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | integer | Car ID (1–14) |

**Response:** Single Car Object (same schema as above).

**Example Request:**

```
GET /api/v1/cars/7
```

**Example Response:**

```json
{
  "id": 7,
  "model_name": "Creta",
  "variant": "SX Tech",
  "body_type": "SUV",
  "fuel_type": "Petrol",
  "transmission": "Manual",
  "price_min": 11.0,
  "price_max": 20.5,
  "mileage": "17.4 kmpl",
  "engine_cc": 1497,
  "seating_capacity": 5,
  "colors": ["Atlas White", "Abyss Black Pearl", "Ranger Khaki", "Typhoon Silver", "Fiery Red", "Starry Night"],
  "features": ["ADAS Safety Suite (19 Features)", "Panoramic Sunroof", "360° Around View Monitor", "..."],
  "image_url": "https://picsum.photos/seed/Creta/600/400",
  "is_available": true
}
```

**Error — 404 Not Found:**

```json
{ "detail": "Car with id=99 not found." }
```

---

## Module: Conversation

### `POST /conversation/message` 🌐

The core chat endpoint. Accepts a customer message and session context; returns an AI-generated reply along with any structured actions (e.g., highlight a car card, open a lead form).

**Request Body:**

```json
{
  "session_id": string,          // UUID; create client-side on session start
  "message": string,             // Customer's typed/transcribed message
  "history": [                   // Prior turns in this session (optional)
    { "role": "user" | "assistant", "content": string }
  ],
  "context": {                   // Optional metadata
    "current_car_id": number | null,
    "lead_id": string | null
  }
}
```

**Response Schema:**

```json
{
  "reply": string,               // AI response text to display / speak
  "actions": [                   // Structured UI actions (may be empty)
    {
      "type": "SHOW_CAR" | "OPEN_LEAD_FORM" | "SHOW_OFFER" | "ESCALATE" | "FILTER_CARS",
      "payload": object          // Action-specific data
    }
  ],
  "session_id": string,
  "tokens_used": number
}
```

**Action Types & Payloads:**

| `type` | `payload` | Description |
|---|---|---|
| `SHOW_CAR` | `{ "car_id": number }` | Highlight a specific car card in the UI |
| `FILTER_CARS` | `{ "filters": { body_type, fuel_type, max_price, ... } }` | Apply catalogue filters |
| `OPEN_LEAD_FORM` | `{}` | Prompt the customer to enter contact details |
| `SHOW_OFFER` | `{ "car_id": number, "offered_price": number, "discount": number }` | Display a negotiated price |
| `ESCALATE` | `{ "reason": string, "urgency": "low"\|"medium"\|"high" }` | Trigger human handoff |

**Example Request:**

```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "I'm looking for a family SUV under 15 lakhs. We are a family of 6.",
  "history": [],
  "context": { "current_car_id": null, "lead_id": null }
}
```

**Example Response:**

```json
{
  "reply": "Great choice for a family! For 6 members, I'd recommend the **Hyundai Alcazar** — our premium 7-seater SUV starting at ₹14.0 Lakhs. It features captain seats with ventilation, a panoramic sunroof, and the full ADAS safety suite. Would you like to see more details or explore other options?",
  "actions": [
    { "type": "SHOW_CAR", "payload": { "car_id": 10 } }
  ],
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tokens_used": 312
}
```

---

## Module: Leads

### `POST /leads` 🌐

Creates a new lead record when a customer provides their contact information.

**Request Body:**

```json
{
  "session_id": string,
  "name": string,
  "phone": string,
  "email": string | null,
  "interested_car_id": number | null,
  "budget_min": number | null,   // in lakhs
  "budget_max": number | null,
  "notes": string | null
}
```

**Response Schema:**

```json
{
  "lead_id": string,             // UUID
  "created_at": string,          // ISO 8601 timestamp
  "status": "new",
  "message": string
}
```

**Example Request:**

```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Ravi Mehta",
  "phone": "+91-99887-65432",
  "email": "ravi.mehta@email.com",
  "interested_car_id": 10,
  "budget_min": 14.0,
  "budget_max": 16.0,
  "notes": "Looking for 7-seater, prefers automatic transmission."
}
```

**Example Response:**

```json
{
  "lead_id": "f8d3e2c1-b0a9-4876-8765-abcdef123456",
  "created_at": "2025-01-15T10:30:00+05:30",
  "status": "new",
  "message": "Thank you, Ravi! Our team will get in touch with you shortly."
}
```

---

### `GET /leads` 🔒

Returns all captured leads. Admin/manager use only.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by `new`, `qualified`, `hot`, `lost` |
| `date_from` | string | ISO date filter start |
| `date_to` | string | ISO date filter end |

**Response Schema:**

```json
{
  "count": number,
  "leads": [
    {
      "lead_id": string,
      "name": string,
      "phone": string,
      "email": string | null,
      "interested_car_id": number | null,
      "budget_min": number | null,
      "budget_max": number | null,
      "score": number | null,
      "status": string,
      "notes": string | null,
      "created_at": string,
      "updated_at": string
    }
  ]
}
```

---

## Module: Scoring

### `POST /leads/{id}/score` 🔒

Runs the lead scoring algorithm on the given lead and updates the record with a quality score (0–100) and a status classification.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Lead UUID |

**Request Body:** _(empty — scoring uses existing lead data)_

```json
{}
```

**Response Schema:**

```json
{
  "lead_id": string,
  "score": number,               // 0–100
  "status": "new" | "qualified" | "hot" | "lost",
  "factors": {
    "budget_clarity": number,    // 0–25
    "model_interest": number,    // 0–25
    "engagement_depth": number,  // 0–25
    "contact_completeness": number // 0–25
  },
  "recommendation": string       // Human-readable action advice
}
```

**Example Response:**

```json
{
  "lead_id": "f8d3e2c1-b0a9-4876-8765-abcdef123456",
  "score": 82,
  "status": "hot",
  "factors": {
    "budget_clarity": 22,
    "model_interest": 25,
    "engagement_depth": 20,
    "contact_completeness": 15
  },
  "recommendation": "High-intent lead. Assign to Senior Sales Executive for immediate follow-up and test drive booking."
}
```

---

## Module: Negotiation

### `POST /negotiation/offer` 🌐

Processes a customer's price counter-offer and returns a calculated response within the pre-approved discount band.

**Request Body:**

```json
{
  "session_id": string,
  "car_id": number,
  "listed_price": number,        // in lakhs
  "customer_offer": number,      // customer's requested price in lakhs
  "lead_id": string | null
}
```

**Response Schema:**

```json
{
  "accepted": boolean,
  "counter_offer": number | null, // in lakhs (null if accepted outright)
  "discount_applied": number,     // in lakhs
  "discount_percent": number,
  "message": string,              // Natural-language response to show customer
  "extras_offered": [string]      // e.g. ["Free 1st Service", "Accessories worth ₹15,000"]
}
```

**Example Request:**

```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "car_id": 7,
  "listed_price": 18.5,
  "customer_offer": 16.5,
  "lead_id": "f8d3e2c1-b0a9-4876-8765-abcdef123456"
}
```

**Example Response:**

```json
{
  "accepted": false,
  "counter_offer": 17.75,
  "discount_applied": 0.75,
  "discount_percent": 4.05,
  "message": "I understand your budget concern! While I can't quite reach ₹16.5L, I can offer you the Creta SX Tech at ₹17.75 Lakhs along with a complimentary first service and accessories worth ₹20,000. This is our best possible offer today!",
  "extras_offered": ["Free 1st Year Service", "Accessories Package worth ₹20,000", "Extended Warranty (1 year)"]
}
```

---

## Module: Escalation

### `POST /escalation/notify` 🌐

Triggers a real-time alert to the showroom's human sales team when the AI determines the customer is ready to proceed (or is beyond the AI's scope).

**Request Body:**

```json
{
  "session_id": string,
  "lead_id": string | null,
  "reason": string,              // Why escalation is triggered
  "urgency": "low" | "medium" | "high",
  "preferred_executive": string | null,  // Sales team member name
  "summary": string              // Brief conversation summary for the executive
}
```

**Response Schema:**

```json
{
  "escalation_id": string,
  "notified_executive": string,
  "notification_method": "push" | "sms" | "in_app",
  "eta_minutes": number | null,
  "message": string              // Message to display to the customer
}
```

**Example Request:**

```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "lead_id": "f8d3e2c1-b0a9-4876-8765-abcdef123456",
  "reason": "Customer confirmed test drive interest for Creta SX Tech",
  "urgency": "high",
  "preferred_executive": null,
  "summary": "Ravi Mehta, budget ₹17–18L, interested in Creta SX Tech, wants test drive today. Has wife with him. Ready to book."
}
```

**Example Response:**

```json
{
  "escalation_id": "esc-20250115-001",
  "notified_executive": "Rajesh Kumar",
  "notification_method": "in_app",
  "eta_minutes": 3,
  "message": "Wonderful! I've notified our Senior Sales Executive, Rajesh Kumar, who will be with you in approximately 3 minutes. Please take a seat and enjoy some refreshments! ☕"
}
```

---

## Error Responses

All endpoints return standard error objects:

| HTTP Code | Meaning | Example |
|---|---|---|
| `400` | Bad Request | Invalid request body or parameter |
| `401` | Unauthorized | Missing or invalid Bearer token |
| `404` | Not Found | Resource ID does not exist |
| `422` | Unprocessable Entity | Validation error (FastAPI default) |
| `429` | Too Many Requests | LLM rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |

**Error Response Schema:**

```json
{
  "detail": string | object   // Human-readable error or FastAPI validation detail
}
```

**422 Validation Example:**

```json
{
  "detail": [
    {
      "loc": ["body", "phone"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```
