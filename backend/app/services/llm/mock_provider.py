"""
mock_provider.py
Structured rule-based AI Sales Executive.

Instead of keyword-matching templates, this provider:
1. Reads CustomerState to know what is already known
2. Extracts new information from the customer message
3. Asks the next most important unknown question naturally
4. Grounds all vehicle recommendations in vehicles.json — nothing invented
"""
from __future__ import annotations

import re
import json
from typing import List, Dict, Optional, Tuple

from app.services.llm.base import BaseLLMProvider
from app.schemas.customer_state import CustomerState, ChatResult
from app.services.vehicle_service import (
    recommend_vehicles,
    search_vehicles,
    get_vehicle_by_id,
)

# ---------------------------------------------------------------------------
# State extractor — simple rule-based NLU
# ---------------------------------------------------------------------------

_FUEL_KEYWORDS = {
    "petrol": "Petrol", "gasoline": "Petrol",
    "diesel": "Diesel",
    "electric": "EV", "ev": "EV", "battery": "EV",
    "cng": "CNG", "compressed natural": "CNG",
    "hybrid": "Hybrid",
}
_TRANSMISSION_KEYWORDS = {
    "manual": "Manual", "stick": "Manual", "mt": "Manual",
    "automatic": "Automatic", "auto": "Automatic", "at": "Automatic",
    "amt": "AMT", "automated manual": "AMT",
}
_USAGE_KEYWORDS = {
    "city": "City", "urban": "City",
    "highway": "Highway", "long distance": "Highway", "road trip": "Highway",
    "mixed": "Mixed", "both": "Mixed",
}
_TIMELINE_KEYWORDS = {
    "immediately": "Immediate", "asap": "Immediate", "this month": "Immediate", "urgent": "Immediate",
    "next month": "1 month", "month": "1 month",
    "three month": "3 months", "3 month": "3 months", "quarter": "3 months",
    "exploring": "Just exploring", "just looking": "Just exploring", "browsing": "Just exploring",
    "not sure": "Just exploring",
}
_CAR_TYPE_KEYWORDS = {
    "suv": "SUV", "crossover": "SUV",
    "sedan": "Sedan",
    "hatchback": "Hatchback", "hatch": "Hatchback",
    "muv": "MUV", "mpv": "MUV", "minivan": "MUV",
}
_INDIAN_STATES = [
    "delhi", "maharashtra", "karnataka", "tamil nadu", "uttar pradesh",
    "gujarat", "west bengal", "telangana", "rajasthan", "kerala",
    "punjab", "haryana", "madhya pradesh",
]
_HYUNDAI_MODELS = [
    "grand i10 nios", "i10", "i20", "aura", "verna", "creta", "venue",
    "tucson", "exter", "ioniq 5", "ioniq5", "alcazar", "santro",
]
_COMPETITOR_MODELS = {
    "nexon": ("Tata Motors", "Nexon"),
    "harrier": ("Tata Motors", "Harrier"),
    "safari": ("Tata Motors", "Safari"),
    "punch": ("Tata Motors", "Punch"),
    "curvv": ("Tata Motors", "Curvv"),
    "tiago": ("Tata Motors", "Tiago"),
    "altroz": ("Tata Motors", "Altroz"),
    "brezza": ("Maruti Suzuki", "Brezza"),
    "swift": ("Maruti Suzuki", "Swift"),
    "baleno": ("Maruti Suzuki", "Baleno"),
    "fronx": ("Maruti Suzuki", "Fronx"),
    "grand vitara": ("Maruti Suzuki", "Grand Vitara"),
    "ertiga": ("Maruti Suzuki", "Ertiga"),
    "wagonr": ("Maruti Suzuki", "WagonR"),
    "alto": ("Maruti Suzuki", "Alto"),
    "s-presso": ("Maruti Suzuki", "S-Presso"),
    "invicto": ("Maruti Suzuki", "Invicto"),
}


def _extract_budget(text: str) -> Tuple[Optional[float], Optional[float]]:
    """Extract budget min/max from natural language. Returns (min, max) in Lakhs."""
    text_l = text.lower()
    # Check for 'k' or 'thousand' (e.g. 50k = 0.50 Lakhs)
    k_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:k|thousand)', text_l)
    if k_match:
        val_in_lakhs = float(k_match.group(1)) / 100.0
        return None, val_in_lakhs

    # Patterns: "10 to 15 lakh", "under 12 lakh", "around 14", "between 8 and 12"
    range_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:to|and|-)\s*(\d+(?:\.\d+)?)\s*(?:lakh|l\b)?', text_l)
    if range_match:
        return float(range_match.group(1)), float(range_match.group(2))
    under_match = re.search(r'(?:under|below|less than|max|maximum|upto|up to)\s*(?:rs\.?\s*)?(\d+(?:\.\d+)?)', text_l)
    if under_match:
        return None, float(under_match.group(1))
    around_match = re.search(r'(?:around|about|approximately|roughly|near)?\s*(?:rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:lakh|l\b)', text_l)
    if around_match:
        v = float(around_match.group(1))
        return v * 0.85, v * 1.15
    nums = re.findall(r'\b(\d{1,2}(?:\.\d+)?)\b', text_l)
    plausible = [float(n) for n in nums if 4.0 <= float(n) <= 80.0]
    if plausible:
        return None, plausible[-1]
    return None, None


def _extract_family_size(text: str) -> Optional[int]:
    text_l = text.lower()
    # "family of 4", "5 people", "7 seater", "we are 6"
    m = re.search(r'\b(\d)\s*(?:people|person|member|seater|passenger|of us|in my family)', text_l)
    if m:
        return int(m.group(1))
    m = re.search(r'(?:family of|team of|group of)\s*(\d)', text_l)
    if m:
        return int(m.group(1))
    if "couple" in text_l or "just two" in text_l or "just 2" in text_l:
        return 2
    return None


def _extract_state(text: str) -> Optional[str]:
    text_l = text.lower()
    for s in _INDIAN_STATES:
        if s in text_l:
            return s.title()
    return None


def _extract_bool_interest(text: str, positive_words: List[str], negative_words: List[str]) -> Optional[bool]:
    text_l = text.lower()
    if any(w in text_l for w in negative_words):
        return False
    if any(w in text_l for w in positive_words):
        return True
    return None


def extract_state_updates(msg: str, state: CustomerState) -> CustomerState:
    """Parse a customer message and return an updated CustomerState (immutable-style)."""
    msg_l = msg.lower()
    updated = state.model_copy(deep=True)

    # Name — "I am Ravi", "My name is Priya", "call me Arjun"
    name_m = re.search(r"(?:i(?:'?m| am)|my name is|call me|this is)\s+([A-Z][a-z]+)", msg, re.IGNORECASE)
    if name_m and not updated.customer_name:
        updated.customer_name = name_m.group(1).strip().title()

    # Budget
    bmin, bmax = _extract_budget(msg)
    if bmin is not None:
        updated.budget_min = bmin
    if bmax is not None:
        updated.budget_max = bmax

    # Fuel
    for kw, val in _FUEL_KEYWORDS.items():
        if kw in msg_l:
            updated.fuel = val
            break

    # Transmission
    for kw, val in _TRANSMISSION_KEYWORDS.items():
        if kw in msg_l:
            updated.transmission = val
            break

    # Usage
    for kw, val in _USAGE_KEYWORDS.items():
        if kw in msg_l:
            updated.usage = val
            break

    # Timeline
    for kw, val in _TIMELINE_KEYWORDS.items():
        if kw in msg_l:
            updated.purchase_timeline = val
            break

    # Car type
    for kw, val in _CAR_TYPE_KEYWORDS.items():
        if kw in msg_l:
            updated.car_type = val
            break

    # Family size
    fs = _extract_family_size(msg)
    if fs:
        updated.family_size = fs

    # State / city
    st = _extract_state(msg)
    if st:
        updated.state = st

    # Finance interest
    fi = _extract_bool_interest(
        msg,
        ["emi", "finance", "loan", "installment", "monthly payment"],
        ["cash", "no emi", "no finance", "pay full", "full payment"]
    )
    if fi is not None:
        updated.finance_interest = fi

    # Test drive interest
    td = _extract_bool_interest(
        msg,
        ["test drive", "test-drive", "drive it", "try the car", "want to drive"],
        ["no test", "not interested in test"]
    )
    if td is not None:
        updated.test_drive_interest = td

    # Hyundai preferred model
    for model in _HYUNDAI_MODELS:
        if model in msg_l:
            updated.preferred_model = model.title()
            break

    # Negotiation / escalation signals
    negotiation_kw = ["discount", "best price", "final price", "lower price", "negotiate", "cheaper", "reduce", "better deal", "cash discount"]
    escalation_kw = ["human", "manager", "speak to someone", "not satisfied", "escalate", "senior", "complaint"]
    if any(k in msg_l for k in negotiation_kw):
        updated.negotiation_requested = True
    if any(k in msg_l for k in escalation_kw):
        updated.escalation_requested = True

    # Objections
    objection_kw = {
        "expensive": "Price too high",
        "too costly": "Price too high",
        "cost more": "Price too high",
        "maintenance": "Maintenance concerns",
        "service": "Service concerns",
        "resale": "Resale value concern",
        "mileage": "Fuel efficiency concern",
        "fuel efficiency": "Fuel efficiency concern",
    }
    for kw, label in objection_kw.items():
        if kw in msg_l and label not in updated.objections:
            updated.objections.append(label)

    return updated


# ---------------------------------------------------------------------------
# Response generator — priority-queue questioning + vehicle grounding
# ---------------------------------------------------------------------------

# What to ask next, in priority order
_QUESTION_QUEUE = [
    ("budget_max",       "What's your approximate budget? You can share a range in Lakhs — for example ₹8–12 Lakhs."),
    ("family_size",      "How many people usually travel with you? This helps me suggest the right seating capacity."),
    ("car_type",         "Are you looking for an SUV, Sedan, or Hatchback? Or do you have a specific model in mind?"),
    ("fuel",             "Do you have a preference for fuel type — Petrol, Diesel, CNG, or Electric?"),
    ("usage",            "Will it be mostly city driving, highways, or a mix of both?"),
    ("purchase_timeline","Are you looking to buy soon, or are you still exploring your options?"),
    ("finance_interest", "Would you be interested in knowing our EMI and finance options?"),
    ("test_drive_interest", "Would you like to schedule a test drive at the showroom?"),
]


def _format_vehicle(v: dict, state_label: str = "") -> str:
    loc = v.get("state", state_label or "Delhi")
    return (
        f"• **{v['brand']} {v['model']}** ({v.get('car_type','')}, {v.get('fuel_type','')}) — "
        f"₹{v.get('on_road_price','N/A')} L on-road in {loc} | Rating: {v.get('rating','N/A')}/5 | "
        f"Seats: {v.get('seating_capacity','N/A')}"
    )


def _get_next_question(state: CustomerState) -> Optional[str]:
    """Return the next qualifying question to ask, or None if all key fields are known."""
    for field, question in _QUESTION_QUEUE:
        val = getattr(state, field, None)
        if val is None:
            return question
    return None


def _build_recommendation_reply(state: CustomerState) -> Tuple[str, List[str]]:
    """Build a grounded recommendation reply using real vehicle data. Returns (reply, vehicle_id_list)."""
    budget = state.get_budget_midpoint()
    recs = recommend_vehicles(
        budget=budget,
        car_type=state.car_type,
        fuel_type=state.fuel,
        seating_capacity=state.family_size,
        state=state.state or "Delhi",
        include_competitors=False,
    )

    primary = recs["primary_recommendations"][:3]  # Show top 3 Hyundai matches
    vehicle_ids = [v["id"] for v in primary]

    if not primary:
        # No Hyundai match at all — show competitors honestly
        recs_all = recommend_vehicles(
            budget=budget,
            car_type=state.car_type,
            fuel_type=state.fuel,
            seating_capacity=state.family_size,
            state=state.state or "Delhi",
            include_competitors=True,
        )
        comps = recs_all["competitor_alternatives"][:2]
        vehicle_ids = [v["id"] for v in comps]
        if comps:
            comp_lines = "\n".join(_format_vehicle(v) for v in comps)
            return (
                f"I want to be honest with you — within your criteria, I don't currently have an exact Hyundai match in stock. "
                f"However, here are some alternatives you might consider:\n{comp_lines}\n"
                f"I'd recommend speaking with our showroom executive to explore custom configurations or upcoming Hyundai launches that may fit your needs. "
                f"Would you like me to arrange that?",
                vehicle_ids,
            )
        return (
            "I'd love to suggest the perfect vehicle for you! Could you share a bit more about your budget and how many people usually travel with you?",
            [],
        )

    lines = "\n".join(_format_vehicle(v, state.state or "Delhi") for v in primary)
    name_part = f"{state.customer_name}, based" if state.customer_name else "Based"
    budget_part = f" within ₹{budget:.0f} Lakhs" if budget else ""
    type_part = f" {state.car_type}" if state.car_type else ""
    fuel_part = f" ({state.fuel})" if state.fuel else ""

    reply = (
        f"{name_part} on your requirements{budget_part}, here are my top Hyundai recommendations{type_part}{fuel_part}:\n\n"
        f"{lines}\n\n"
        f"All prices are on-road for {state.state or 'Delhi'}. Would you like a detailed breakdown of any of these, or shall I arrange a test drive?"
    )
    return reply, vehicle_ids


def _build_comparison_reply(state: CustomerState, competitor_brand: str, competitor_model: str) -> Tuple[str, List[str]]:
    """Return a factual Hyundai vs competitor comparison."""
    budget = state.get_budget_midpoint()
    location = state.state or "Delhi"

    # Find the best comparable Hyundai
    hyundai_recs = recommend_vehicles(
        budget=budget,
        car_type=state.car_type,
        fuel_type=state.fuel,
        state=location,
    )
    hyundai_v = hyundai_recs["primary_recommendations"][0] if hyundai_recs["primary_recommendations"] else None

    # Find competitor vehicle
    comp_results = search_vehicles(brand=competitor_brand, model=competitor_model, state=location)
    comp_v = comp_results[0] if comp_results else None

    vehicle_ids = []
    if hyundai_v:
        vehicle_ids.append(hyundai_v["id"])
    if comp_v:
        vehicle_ids.append(comp_v["id"])

    if not hyundai_v and not comp_v:
        return (
            f"I don't have detailed comparison data for that model in my current database. "
            f"Let me know your budget and I'll pull up the closest Hyundai options for you.",
            [],
        )

    parts = []
    if hyundai_v:
        parts.append(
            f"**Hyundai {hyundai_v['model']}** ({hyundai_v['car_type']}, {hyundai_v.get('fuel_type','')}) — "
            f"₹{hyundai_v['on_road_price']} L on-road | Rating: {hyundai_v['rating']}/5 | Seats: {hyundai_v.get('seating_capacity','N/A')}"
        )
    if comp_v:
        parts.append(
            f"**{comp_v['brand']} {comp_v['model']}** ({comp_v['car_type']}, {comp_v.get('fuel_type','')}) — "
            f"₹{comp_v['on_road_price']} L on-road | Rating: {comp_v['rating']}/5 | Seats: {comp_v.get('seating_capacity','N/A')}"
        )

    comparison = "\n".join(parts)

    # Honest verdict
    if hyundai_v and comp_v:
        h_rating = hyundai_v.get("rating") or 0
        c_rating = comp_v.get("rating") or 0
        h_price = hyundai_v.get("on_road_price") or 0
        c_price = comp_v.get("on_road_price") or 0

        if h_rating > c_rating and h_price <= c_price * 1.1:
            verdict = f"Based on the data, the Hyundai {hyundai_v['model']} offers a higher customer rating ({h_rating}/5 vs {c_rating}/5) at a comparable price point."
        elif h_rating > c_rating:
            verdict = f"The Hyundai {hyundai_v['model']} has a higher rating ({h_rating}/5 vs {c_rating}/5), though it is priced higher. The premium reflects Hyundai's build quality and features — which may be worth it depending on your priorities."
        elif c_rating > h_rating:
            verdict = f"The {comp_v['brand']} {comp_v['model']} has a slightly higher rating in this dataset ({c_rating}/5 vs {h_rating}/5). I want to be transparent about that. However, Hyundai offers an extensive service network, longer warranty, and strong resale value — factors worth considering."
        else:
            verdict = f"Both vehicles are very closely rated. Your choice may come down to brand preference, specific features, and after-sales service experience."
    else:
        verdict = ""

    reply = f"Here's a factual comparison using the data I have:\n\n{comparison}\n\n{verdict}\n\nWould you like a test drive of the Hyundai option to experience it first-hand?"
    return reply, vehicle_ids


# ---------------------------------------------------------------------------
# MockLLMProvider
# ---------------------------------------------------------------------------

class MockLLMProvider(BaseLLMProvider):
    """
    Structured rule-based AI Sales Executive.
    Priority-queue conversation flow + grounded vehicle recommendations.
    """

    def chat(
        self,
        messages: List[Dict[str, str]],
        customer_state: Optional[CustomerState] = None,
        showroom_id: str = "HYD-DEL-001",
    ) -> ChatResult:
        if customer_state is None:
            customer_state = CustomerState()

        if not messages:
            return ChatResult(
                reply=(
                    "Welcome to Hyundai! I'm Aria, your AI Sales Executive. "
                    "I'm here to help you find the perfect Hyundai vehicle. "
                    "May I know your name, and what brings you in today?"
                ),
                customer_state=customer_state,
            )

        last_msg = messages[-1].get("content", "").strip()
        msg_l = last_msg.lower()

        # 1. Extract state updates from the latest customer message
        updated_state = extract_state_updates(last_msg, customer_state)

        # 2. Handle escalation immediately
        if updated_state.escalation_requested:
            return ChatResult(
                reply=(
                    "I completely understand. Let me connect you with our Senior Sales Executive right away. "
                    "They will be able to assist you personally and address all your concerns. "
                    "One moment please."
                ),
                customer_state=updated_state,
                should_escalate=True,
                should_collect_lead=True,
            )

        # 3. Handle negotiation / discount requests via deterministic negotiation engine
        if updated_state.negotiation_requested:
            from app.services.negotiation_engine import evaluate_negotiation, get_negotiation_rule
            from app.schemas.negotiation_engine import NegotiationEvaluateRequest

            v_id = "hyundai_creta_delhi"
            if updated_state.preferred_model:
                m_slug = updated_state.preferred_model.lower().replace(' ', '_')
                st_slug = (updated_state.state or 'delhi').lower()
                v_id = f"hyundai_{m_slug}_{st_slug}"

            bmin, bmax = _extract_budget(last_msg)
            offer_val = bmax or bmin or 0.50

            eval_res = evaluate_negotiation(
                NegotiationEvaluateRequest(
                    vehicle_id=v_id,
                    customer_offer=offer_val,
                    customer_context=updated_state.model_dump(),
                )
            )
            rule = get_negotiation_rule(v_id)

            if eval_res.allowed and not eval_res.requires_human:
                reply = (
                    f"I evaluated your offer using our automated pricing policy: "
                    f"your offer of ₹{eval_res.counter_offer:.2f} Lakhs is approved! "
                    f"This includes {rule.accessory_offer or 'free accessories'} and {rule.available_offer or 'standard showroom benefits'}. "
                    f"Would you like to schedule a test drive or receive a formal quotation?"
                )
            else:
                reply = (
                    f"I can provide standard state on-road price estimates. For special showroom discounts, "
                    f"exchange bonuses, or price approvals beyond my automated authority, I will connect you "
                    f"directly with our Senior Sales Executive. Our best automated counter-offer is ₹{eval_res.counter_offer:.2f} Lakhs "
                    f"(includes {rule.accessory_offer or 'standard accessories'}). "
                    f"Would you like me to request an executive callback and prepare an exact quotation?"
                )

            return ChatResult(
                reply=reply,
                customer_state=updated_state,
                should_escalate=eval_res.requires_human,
                should_collect_lead=True,
            )

        # 3b. Handle sub-5 Lakh low budget honest competitor trade-off
        if any(w in msg_l for w in ["under 5", "sub 5", "4 lakh", "3 lakh", "cheap car"]):
            return ChatResult(
                reply=(
                    "Our Hyundai range starts with the Grand i10 Nios at ₹5.4 Lakhs in Delhi (Rating 4.35/5). "
                    "Competitors like Maruti S-Presso/Alto start under ₹5 Lakhs. While Maruti fits a sub-₹5 Lakh budget, "
                    "the Grand i10 Nios provides a safer chassis, higher rating, and premium interior. "
                    "If your budget is flexible up to ₹5.4 Lakhs, I highly recommend the Grand i10 Nios. "
                    "Shall I arrange a test drive or connect you with our executive for EMI options?"
                ),
                customer_state=updated_state,
            )

        # 4. Handle competitor comparison queries
        detected_competitor = None
        for kw, (brand, model) in _COMPETITOR_MODELS.items():
            if kw in msg_l:
                detected_competitor = (brand, model)
                break
        is_comparison = detected_competitor or any(
            q in msg_l for q in ["compare", "vs ", "versus", "which is better", "difference between", "better than"]
        )

        if is_comparison and detected_competitor:
            if updated_state.known_fields_count() < 2:
                return ChatResult(
                    reply=(
                        f"Great, I can absolutely compare those for you! To give you the most relevant comparison, "
                        f"could you quickly tell me your budget range and how many people usually travel with you?"
                    ),
                    customer_state=updated_state,
                )
            comp_reply, comp_ids = _build_comparison_reply(
                updated_state, detected_competitor[0], detected_competitor[1]
            )
            return ChatResult(
                reply=comp_reply,
                customer_state=updated_state,
                recommended_vehicle_ids=comp_ids,
                should_collect_lead=updated_state.known_fields_count() >= 3,
            )

        # 5. Handle test drive confirmation
        if updated_state.test_drive_interest is True and "test drive" in msg_l:
            return ChatResult(
                reply=(
                    "Wonderful! I'll arrange a test drive for you at our showroom. "
                    "Our executive will reach out to confirm the date and time. "
                    "Could I also get your contact number so we can schedule it?"
                ),
                customer_state=updated_state,
                should_collect_lead=True,
            )

        # 6. Handle finance interest
        if updated_state.finance_interest is True and any(w in msg_l for w in ["emi", "finance", "loan", "installment"]):
            budget = updated_state.get_budget_midpoint()
            if budget:
                approx_emi = round((budget * 100000) / (60 * 0.9), 0)  # rough 5yr estimate
                return ChatResult(
                    reply=(
                        f"For a vehicle around ₹{budget:.0f} Lakhs, a typical 5-year EMI with 10% down payment would be "
                        f"approximately ₹{approx_emi:,.0f}/month (this is an indicative figure — exact rates depend on your credit profile and the financier). "
                        f"Our showroom works with major banks for competitive rates. Would you like me to connect you with our finance team?"
                    ),
                    customer_state=updated_state,
                    should_collect_lead=updated_state.known_fields_count() >= 3,
                )

        # 7. If a specific Hyundai model is mentioned, fetch real data
        if updated_state.preferred_model:
            model_results = search_vehicles(model=updated_state.preferred_model, state=updated_state.state or "Delhi")
            if model_results:
                v = model_results[0]
                next_q = _get_next_question(updated_state)
                next_part = f" {next_q}" if next_q else " Would you like to schedule a test drive?"
                return ChatResult(
                    reply=(
                        f"Excellent choice! The Hyundai {v['model']} ({v['car_type']}) is a top-rated vehicle with a "
                        f"customer rating of {v['rating']}/5. On-road price in {v['state']}: ₹{v['on_road_price']} Lakhs "
                        f"(ex-showroom ₹{v['showroom_price']} L + charges ₹{v['other_charges']} L)."
                        f"{next_part}"
                    ),
                    customer_state=updated_state,
                    recommended_vehicle_ids=[v["id"]],
                    should_collect_lead=updated_state.known_fields_count() >= 3,
                )

        # 8. If we have budget or car_type + budget, or >= 2 known fields, give a recommendation
        if updated_state.known_fields_count() >= 2 or (updated_state.get_budget_midpoint() and updated_state.car_type):
            rec_reply, rec_ids = _build_recommendation_reply(updated_state)
            if rec_ids:
                return ChatResult(
                    reply=rec_reply,
                    customer_state=updated_state,
                    recommended_vehicle_ids=rec_ids,
                    should_collect_lead=True,
                )

        # 9. Ask the next priority question
        next_q = _get_next_question(updated_state)
        if next_q:
            # Personalise with name if known
            if updated_state.customer_name:
                greeting = f"Thank you, {updated_state.customer_name}! "
            else:
                greeting = ""
            return ChatResult(
                reply=f"{greeting}{next_q}",
                customer_state=updated_state,
            )

        # Fallback
        return ChatResult(
            reply=(
                "I'm here to help you find your perfect Hyundai! Could you tell me a bit more about "
                "what you're looking for — your budget range, or the type of vehicle you have in mind?"
            ),
            customer_state=updated_state,
        )

    def get_provider_name(self) -> str:
        return "mock"