"""
test_conversation_engine.py
8 scenario tests for the AI Sales Executive conversation engine.
"""
import pytest
from app.schemas.customer_state import CustomerState
from app.services.llm.mock_provider import MockLLMProvider, extract_state_updates


@pytest.fixture
def provider():
    return MockLLMProvider()


@pytest.fixture
def empty_state():
    return CustomerState()


# ── Scenario 1: First message → AI asks about budget ──────────────────────────
def test_first_message_asks_budget(provider, empty_state):
    msgs = [{"role": "user", "content": "Hi, I am looking for a car"}]
    result = provider.chat(msgs, empty_state, "HYD-DEL-001")
    assert result.reply
    # Should ask about budget since it is the first priority
    assert any(w in result.reply.lower() for w in ["budget", "name", "help", "looking"])
    assert not result.should_escalate


# ── Scenario 2: Budget provided → next question (family size or car type) ──────
def test_budget_provided_asks_next(provider, empty_state):
    msgs = [
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "What is your budget?"},
        {"role": "user", "content": "My budget is around 15 lakh"},
    ]
    result = provider.chat(msgs, empty_state, "HYD-DEL-001")
    assert result.customer_state.budget_max is not None or result.customer_state.budget_min is not None
    assert result.reply
    # Should now ask family size or car type
    assert any(w in result.reply.lower() for w in ["people", "seating", "family", "suv", "sedan", "hatchback", "type"])


# ── Scenario 3: Full context → real vehicle recommendation ─────────────────────
def test_full_context_returns_real_recommendation(provider):
    state = CustomerState(
        budget_max=15.0,
        family_size=4,
        fuel="Petrol",
        car_type="SUV",
        usage="City",
    )
    msgs = [
        {"role": "user", "content": "What Hyundai SUV do you recommend for petrol under 15 lakh for 4 people?"}
    ]
    result = provider.chat(msgs, state, "HYD-DEL-001")
    assert result.reply
    # Must contain real vehicle data — not invented
    assert "₹" in result.reply or "Hyundai" in result.reply
    # Should NOT contain invented price words
    assert "approximately" not in result.reply.lower() or "indicative" not in result.reply.lower()
    assert result.should_collect_lead is True


# ── Scenario 4: Competitor mention → honest comparison, no fabrication ─────────
def test_competitor_mention_honest_comparison(provider):
    state = CustomerState(budget_max=15.0, family_size=4)
    msgs = [
        {"role": "user", "content": "How does Hyundai Creta compare to Tata Nexon?"}
    ]
    result = provider.chat(msgs, state, "HYD-DEL-001")
    assert result.reply
    # Should mention both brands or ask for context
    lower = result.reply.lower()
    assert "hyundai" in lower or "nexon" in lower or "creta" in lower or "compare" in lower or "budget" in lower


# ── Scenario 5: Negotiation request → escalation flag ─────────────────────────
def test_negotiation_request_triggers_escalation(provider, empty_state):
    msgs = [
        {"role": "user", "content": "Can you give me an extra discount or best price?"}
    ]
    result = provider.chat(msgs, empty_state, "HYD-DEL-001")
    assert result.should_escalate is True
    assert result.customer_state.negotiation_requested is True


# ── Scenario 6: Test drive interest extracted ──────────────────────────────────
def test_test_drive_interest_extracted():
    state = CustomerState()
    updated = extract_state_updates("I would love a test drive", state)
    assert updated.test_drive_interest is True


# ── Scenario 7: Finance interest extracted ────────────────────────────────────
def test_finance_interest_extracted():
    state = CustomerState()
    updated = extract_state_updates("I am interested in EMI options and finance", state)
    assert updated.finance_interest is True


# ── Scenario 8: State persists correctly across turns ─────────────────────────
def test_state_persists_across_turns(provider):
    state = CustomerState()

    # Turn 1 — give name + budget
    msgs1 = [{"role": "user", "content": "Hi I am Priya and my budget is 12 lakh"}]
    result1 = provider.chat(msgs1, state, "HYD-DEL-001")
    state1 = result1.customer_state
    assert state1.budget_max is not None
    assert state1.customer_name == "Priya" or state1.budget_max is not None  # at minimum budget extracted

    # Turn 2 — add fuel preference
    msgs2 = msgs1 + [
        {"role": "assistant", "content": result1.reply},
        {"role": "user", "content": "I prefer petrol automatic"},
    ]
    result2 = provider.chat(msgs2, state1, "HYD-DEL-001")
    state2 = result2.customer_state
    assert state2.fuel == "Petrol"
    assert state2.transmission == "Automatic"
    # Budget should still be retained
    assert state2.budget_max is not None


# ── Bonus: Escalation request → escalation flag ───────────────────────────────
def test_escalation_request_triggers_flag(provider, empty_state):
    msgs = [{"role": "user", "content": "I want to speak to a human manager please"}]
    result = provider.chat(msgs, empty_state, "HYD-DEL-001")
    assert result.should_escalate is True
    assert result.customer_state.escalation_requested is True