"""
vehicle_service.py
Unified vehicle data layer.

Data priority:
  1. Excel file (Tata_Maruti_Hyundai_Car_Price_Dataset.xlsx) — live source of truth
  2. vehicles.json — fallback if Excel/openpyxl not available

All other services (mock_provider, conversation_engine, agora_service) must
go through this module — never read raw data files directly.
"""
import json
from pathlib import Path
from typing import List, Optional, Dict, Any

_json_cache: Optional[List[Dict[str, Any]]] = None


def _get_json_filepath() -> Path:
    """Locate vehicles.json searching common relative paths."""
    p1 = Path(__file__).parent.parent.parent / "data" / "vehicles.json"
    if p1.exists():
        return p1
    p2 = Path(__file__).parent.parent.parent.parent / "data" / "vehicles.json"
    if p2.exists():
        return p2
    return p1


def load_vehicles() -> List[Dict[str, Any]]:
    """
    Load vehicles with Excel-first priority:
      1. Try Excel loader (live, authoritative)
      2. Fall back to vehicles.json (static copy)
    Result is module-level cached after first call.
    """
    global _json_cache
    if _json_cache is not None:
        return _json_cache

    # --- Try Excel first ---
    try:
        from app.services.excel_loader import get_all_vehicles_from_excel
        excel_data = get_all_vehicles_from_excel()
        if excel_data:
            _json_cache = excel_data
            return _json_cache
    except Exception as e:
        print(f"[VehicleService] Excel load failed ({e}), falling back to JSON.")

    # --- Fallback: vehicles.json ---
    p = _get_json_filepath()
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            _json_cache = json.load(f)
            print(f"[VehicleService] Loaded {len(_json_cache)} vehicles from vehicles.json")
            return _json_cache

    print("[VehicleService] WARNING: No vehicle data source found.")
    return []


def get_all_vehicles(
    state: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    vehicles = load_vehicles()
    if state:
        state_clean = state.strip().lower()
        vehicles = [v for v in vehicles if v.get("state") and v["state"].strip().lower() == state_clean]
    if limit:
        return vehicles[offset : offset + limit]
    return vehicles[offset:]


def get_vehicle_by_id(vehicle_id: str) -> Optional[Dict[str, Any]]:
    vehicles = load_vehicles()
    v_id_clean = vehicle_id.strip().lower()
    for v in vehicles:
        if v["id"].lower() == v_id_clean:
            return v
    # Try prefix match if exact fails
    for v in vehicles:
        if v["id"].lower().startswith(v_id_clean):
            return v
    return None


def search_vehicles(
    brand: Optional[str] = None,
    model: Optional[str] = None,
    budget: Optional[float] = None,
    car_type: Optional[str] = None,
    fuel_type: Optional[str] = None,
    seating_capacity: Optional[int] = None,
    state: Optional[str] = None,
) -> List[Dict[str, Any]]:
    vehicles = load_vehicles()
    results = []

    for v in vehicles:
        if state and v.get("state") and v["state"].strip().lower() != state.strip().lower():
            continue
        if brand and v.get("brand") and brand.strip().lower() not in v["brand"].strip().lower():
            continue
        if model and v.get("model") and model.strip().lower() not in v["model"].strip().lower():
            continue
        if budget is not None:
            price = v.get("on_road_price") or v.get("showroom_price") or 0.0
            if price > budget:
                continue
        if car_type and v.get("car_type"):
            if car_type.strip().lower() not in v["car_type"].strip().lower():
                continue
        if fuel_type and v.get("fuel_type"):
            if fuel_type.strip().lower() not in v["fuel_type"].strip().lower():
                continue
        if seating_capacity is not None and v.get("seating_capacity") is not None:
            if v["seating_capacity"] < seating_capacity:
                continue
        results.append(v)

    return results


def compare_vehicles(vehicle_ids: List[str]) -> Dict[str, Any]:
    matched = []
    for vid in vehicle_ids:
        v = get_vehicle_by_id(vid)
        if v and v not in matched:
            matched.append(v)

    matrix = {
        "showroom_prices": {v["id"]: v["showroom_price"] for v in matched},
        "on_road_prices": {v["id"]: v["on_road_price"] for v in matched},
        "ratings": {v["id"]: v["rating"] for v in matched},
        "car_types": {v["id"]: v["car_type"] for v in matched},
        "fuel_types": {v["id"]: v["fuel_type"] for v in matched},
        "seating": {v["id"]: v["seating_capacity"] for v in matched},
        "brands": {v["id"]: v["brand"] for v in matched},
        "is_primary_brand": {v["id"]: v["is_primary_brand"] for v in matched},
    }

    hyundai_v = [v for v in matched if v["is_primary_brand"]]
    competitor_v = [v for v in matched if v["is_competitor"]]

    if hyundai_v:
        h = hyundai_v[0]
        summary = (
            f"Comparing {len(matched)} vehicles. "
            f"Hyundai {h['model']} (₹{h['on_road_price']} L on-road, rating {h['rating']}/5) "
            f"offers competitive value with Hyundai's service network and warranty."
        )
    else:
        summary = f"Comparing {len(matched)} vehicles across specifications, pricing, and ratings."

    return {
        "vehicles": matched,
        "comparison_matrix": matrix,
        "summary": summary,
    }


def recommend_vehicles(
    budget: Optional[float] = None,
    car_type: Optional[str] = None,
    fuel_type: Optional[str] = None,
    seating_capacity: Optional[int] = None,
    state: Optional[str] = None,
    include_competitors: bool = False,
) -> Dict[str, Any]:
    filtered = search_vehicles(
        budget=budget,
        car_type=car_type,
        fuel_type=fuel_type,
        seating_capacity=seating_capacity,
        state=state,
    )

    primary = [v for v in filtered if v["is_primary_brand"]]
    competitors = [v for v in filtered if v["is_competitor"]]

    primary.sort(key=lambda x: (x.get("rating") or 0.0), reverse=True)
    competitors.sort(key=lambda x: (x.get("rating") or 0.0), reverse=True)

    show_competitors = include_competitors or (len(primary) == 0)
    returned_competitors = competitors if show_competitors else []

    if primary:
        top_h = primary[0]
        reasoning = (
            f"Top Hyundai recommendation: {top_h['model']} ({top_h['car_type']}, "
            f"₹{top_h['on_road_price']} L on-road in {top_h['state']}, "
            f"rating {top_h['rating']}/5, {top_h['fuel_type']}, {top_h['seating_capacity']} seats)."
        )
    else:
        reasoning = "No exact Hyundai model matched your filter criteria — competitor options shown for comparison."

    return {
        "primary_recommendations": primary,
        "competitor_alternatives": returned_competitors,
        "reasoning": reasoning,
    }


def get_brand_summary_table(brand: str = "Hyundai", state: str = "Delhi") -> str:
    """
    Return a markdown table of unique models for a brand at a given state.
    Used to populate LLM system prompts with real data.
    """
    vehicles = search_vehicles(brand=brand, state=state)

    # Deduplicate by model
    seen: set = set()
    deduped = []
    for v in vehicles:
        if v["model"] not in seen:
            seen.add(v["model"])
            deduped.append(v)

    if not deduped:
        return f"No {brand} vehicles found in dataset."

    lines = [f"| Model | Type | Fuel | Seats | Ex-Showroom (₹L) | On-Road (₹L, {state}) | Rating |"]
    lines.append("|---|---|---|---|---|---|---|")
    for v in deduped:
        lines.append(
            f"| {v['model']} | {v.get('car_type', '')} | {v.get('fuel_type', '')} | "
            f"{v.get('seating_capacity', '')} | ₹{v['showroom_price']} | "
            f"₹{v['on_road_price']} | {v['rating']}/5 |"
        )
    return "\n".join(lines)
