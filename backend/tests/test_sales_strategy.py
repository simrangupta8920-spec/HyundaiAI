import unittest
from app.services.llm.mock_provider import MockLLMProvider
from app.services.llm.base import SYSTEM_PROMPT

class TestSalesStrategy(unittest.TestCase):

    def setUp(self):
        self.provider = MockLLMProvider()

    def test_system_prompt_rules_present(self):
        """Verify that official sales rules exist in SYSTEM_PROMPT constant."""
        self.assertIn("Hyundai Showroom", SYSTEM_PROMPT)
        self.assertIn("Recommend suitable Hyundai vehicles first", SYSTEM_PROMPT)
        self.assertIn("NEVER fabricate competitor disadvantages", SYSTEM_PROMPT)
        self.assertIn("Ask whether the customer wants a test drive", SYSTEM_PROMPT)

    def test_confused_competitor_comparison_qualifying_question(self):
        """Test rule: Ambiguous comparison asks budget & seating questions first."""
        messages = [{"role": "user", "content": "I'm confused between Hyundai Creta and Tata Nexon."}]
        reply = self.provider.chat(messages)
        self.assertIn("budget", reply.lower())
        self.assertIn("people usually travel", reply.lower())

    def test_price_discount_escalation(self):
        """Test rule 15: Escalate pricing/discount requests beyond AI authority."""
        messages = [{"role": "user", "content": "Can I get an extra cash discount of 50k on the final price?"}]
        reply = self.provider.chat(messages)
        self.assertIn("Senior Sales Executive", reply)
        self.assertIn("quotation", reply.lower())

    def test_low_budget_honest_competitor_tradeoff(self):
        """Test rule 10: Low budget competitor acknowledgment with honest trade-off."""
        messages = [{"role": "user", "content": "I want a cheap car under 5 Lakhs."}]
        reply = self.provider.chat(messages)
        self.assertIn("Grand i10 Nios", reply)
        self.assertIn("Maruti", reply)

    def test_hyundai_recommendation_and_test_drive_close(self):
        """Test rules 2, 3, 11, 13, 14: Recommend Hyundai, state specs, offer test drive & quotation."""
        messages = [
            {"role": "user", "content": "I need a family SUV around 15 Lakhs in Delhi."}
        ]
        reply = self.provider.chat(messages)
        self.assertIn("Hyundai", reply)
        self.assertIn("Lakhs", reply)
        self.assertIn("test drive", reply.lower())

if __name__ == "__main__":
    unittest.main()
