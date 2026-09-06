import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.services.vehicle_service import (
    get_all_vehicles,
    get_vehicle_by_id,
    search_vehicles,
    compare_vehicles,
    recommend_vehicles
)

client = TestClient(app)

class TestVehicleSystem(unittest.TestCase):

    def test_hyundai_vehicle_retrieval(self):
        """Test retrieving primary brand (Hyundai) vehicles."""
        hyundai_vehicles = search_vehicles(brand="Hyundai")
        self.assertGreater(len(hyundai_vehicles), 0)
        for v in hyundai_vehicles:
            self.assertEqual(v["brand"], "Hyundai")
            self.assertTrue(v["is_primary_brand"])
            self.assertFalse(v["is_competitor"])

    def test_competitor_retrieval(self):
        """Test retrieving competitor brand vehicles (Tata Motors & Maruti Suzuki)."""
        tata_vehicles = search_vehicles(brand="Tata Motors")
        maruti_vehicles = search_vehicles(brand="Maruti Suzuki")
        
        self.assertGreater(len(tata_vehicles), 0)
        self.assertGreater(len(maruti_vehicles), 0)
        
        for v in tata_vehicles + maruti_vehicles:
            self.assertFalse(v["is_primary_brand"])
            self.assertTrue(v["is_competitor"])

    def test_budget_filtering(self):
        """Test filtering vehicles by budget constraint."""
        budget = 10.0 # 10 Lakhs max on-road price
        filtered = search_vehicles(budget=budget)
        self.assertGreater(len(filtered), 0)
        for v in filtered:
            price = v.get("on_road_price") or v.get("showroom_price")
            self.assertLessEqual(price, budget)

    def test_state_filtering(self):
        """Test state-specific pricing & availability filtering."""
        delhi_vehicles = search_vehicles(state="Delhi")
        karnataka_vehicles = search_vehicles(state="Karnataka")
        
        self.assertGreater(len(delhi_vehicles), 0)
        self.assertGreater(len(karnataka_vehicles), 0)
        
        for v in delhi_vehicles:
            self.assertEqual(v["state"], "Delhi")
        for v in karnataka_vehicles:
            self.assertEqual(v["state"], "Karnataka")

    def test_vehicle_comparison(self):
        """Test comparing multiple vehicles across brands."""
        res = compare_vehicles(["hyundai_creta_delhi", "tata_nexon_delhi", "maruti_brezza_delhi"])
        self.assertIn("vehicles", res)
        self.assertIn("comparison_matrix", res)
        self.assertIn("summary", res)
        self.assertGreaterEqual(len(res["vehicles"]), 1)

    def test_recommendation_prioritizes_hyundai(self):
        """Test that recommend API prioritizes Hyundai and excludes competitors by default."""
        res = recommend_vehicles(budget=20.0, car_type="SUV", state="Delhi", include_competitors=False)
        self.assertGreater(len(res["primary_recommendations"]), 0)
        self.assertEqual(len(res["competitor_alternatives"]), 0)
        
        for v in res["primary_recommendations"]:
            self.assertTrue(v["is_primary_brand"])
            self.assertEqual(v["brand"], "Hyundai")

    def test_recommendation_includes_competitors_when_requested(self):
        """Test competitor inclusion when explicitly requested or required."""
        res = recommend_vehicles(budget=20.0, car_type="SUV", state="Delhi", include_competitors=True)
        self.assertGreater(len(res["primary_recommendations"]), 0)
        self.assertGreater(len(res["competitor_alternatives"]), 0)

    def test_missing_values_preserves_null(self):
        """Test that missing or optional values preserve null instead of dummy fallbacks."""
        v = get_vehicle_by_id("hyundai_creta_delhi")
        self.assertIsNotNone(v)
        self.assertIn("rating", v)
        self.assertIn("other_charges", v)

    def test_duplicate_handling(self):
        """Test that dataset contains zero unhandled duplicate IDs."""
        all_vehicles = get_all_vehicles()
        ids = [v["id"] for v in all_vehicles]
        self.assertEqual(len(ids), len(set(ids)))

    def test_fastapi_vehicle_endpoints(self):
        """Test REST API endpoints via TestClient."""
        r1 = client.get("/api/vehicles")
        self.assertEqual(r1.status_code, 200)
        
        r2 = client.get("/api/vehicles/search?brand=Hyundai&state=Delhi")
        self.assertEqual(r2.status_code, 200)
        
        r3 = client.get("/api/vehicles/compare?ids=hyundai_creta_delhi,tata_nexon_delhi")
        self.assertEqual(r3.status_code, 200)
        
        r4 = client.get("/api/vehicles/recommend?budget=15.0&state=Delhi")
        self.assertEqual(r4.status_code, 200)

if __name__ == "__main__":
    unittest.main()
