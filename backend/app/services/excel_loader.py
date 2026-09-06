"""
excel_loader.py
Loads the Tata_Maruti_Hyundai_Car_Price_Dataset.xlsx into memory at startup
and exposes helpers used by vehicle_service.py.

The Excel columns are:
  Brand | Model | Car Type | Seating Capacity | Fuel Type |
  Showroom Price (Ex-Showroom, Rs Lakh) | Rating (out of 5) | State | Other Charges (Rs Lakh, approx.)

On-road price = Showroom Price + Other Charges.
IDs are generated as: brand_model_state (lower-snake-case).
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import List, Dict, Any, Optional

_EXCEL_CACHE: Optional[List[Dict[str, Any]]] = None

_PRIMARY_BRAND = "Hyundai"
_COMPETITOR_BRANDS = {"Tata Motors", "Maruti Suzuki"}


def _slugify(text: str) -> str:
    """Convert 'Tata Motors' → 'tata_motors', 'Grand i10 Nios' → 'grand_i10_nios'."""
    s = text.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def _find_excel_path() -> Optional[Path]:
    """Search common locations for the Excel file."""
    candidates = [
        # Repo root
        Path(__file__).parent.parent.parent.parent / "Tata_Maruti_Hyundai_Car_Price_Dataset.xlsx",
        # backend/data/
        Path(__file__).parent.parent.parent / "data" / "Tata_Maruti_Hyundai_Car_Price_Dataset.xlsx",
        # data/ next to backend/
        Path(__file__).parent.parent.parent.parent / "data" / "Tata_Maruti_Hyundai_Car_Price_Dataset.xlsx",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def _row_to_vehicle(row: tuple) -> Optional[Dict[str, Any]]:
    """Convert one Excel row tuple → vehicle dict. Returns None if row is invalid."""
    try:
        brand         = str(row[0]).strip() if row[0] else None
        model         = str(row[1]).strip() if row[1] else None
        car_type      = str(row[2]).strip() if row[2] else None
        seating       = int(row[3]) if row[3] is not None else None
        fuel_type     = str(row[4]).strip() if row[4] else None
        show_price    = float(row[5]) if row[5] is not None else None
        rating        = float(row[6]) if row[6] is not None else None
        state         = str(row[7]).strip() if row[7] else None
        other_charges = float(row[8]) if row[8] is not None else 0.0

        if not brand or not model or show_price is None or not state:
            return None

        on_road = round(show_price + other_charges, 2)
        is_primary = (brand == _PRIMARY_BRAND)

        vehicle_id = f"{_slugify(brand)}_{_slugify(model)}_{_slugify(state)}"

        return {
            "id": vehicle_id,
            "brand": brand,
            "model": model,
            "car_type": car_type,
            "seating_capacity": seating,
            "fuel_type": fuel_type,
            "showroom_price": show_price,
            "rating": rating,
            "state": state,
            "other_charges": other_charges,
            "on_road_price": on_road,
            "is_primary_brand": is_primary,
            "is_competitor": not is_primary,
        }
    except Exception:
        return None


def load_from_excel() -> List[Dict[str, Any]]:
    """
    Read the Excel file and return the full vehicle list.
    Returns an empty list (with a warning) if openpyxl is not installed or the file is not found.
    """
    path = _find_excel_path()
    if path is None:
        print("[ExcelLoader] WARNING: Excel file not found. Falling back to vehicles.json.")
        return []

    try:
        import openpyxl  # type: ignore
    except ImportError:
        print("[ExcelLoader] WARNING: openpyxl not installed. Run: pip install openpyxl")
        return []

    wb = openpyxl.load_workbook(str(path), read_only=True, data_only=True)
    sheet = wb["Car Price Dataset"]
    rows = list(sheet.iter_rows(values_only=True))
    wb.close()

    # rows[0] = header row — skip it
    vehicles: List[Dict[str, Any]] = []
    for row in rows[1:]:
        v = _row_to_vehicle(row)
        if v:
            vehicles.append(v)

    print(f"[ExcelLoader] Loaded {len(vehicles)} vehicles from {path.name}")
    return vehicles


def get_all_vehicles_from_excel() -> List[Dict[str, Any]]:
    """Return cached vehicle list loaded from Excel (loads once at first call)."""
    global _EXCEL_CACHE
    if _EXCEL_CACHE is None:
        _EXCEL_CACHE = load_from_excel()
    return _EXCEL_CACHE


def invalidate_cache() -> None:
    """Force reload on next call (useful for hot-reload in dev)."""
    global _EXCEL_CACHE
    _EXCEL_CACHE = None


def get_excel_summary_for_brand(brand: str) -> List[Dict[str, Any]]:
    """
    Return deduplicated (by model) vehicles for a brand, using Delhi prices.
    Used to build LLM system prompts grounded in real Excel data.
    """
    vehicles = get_all_vehicles_from_excel()
    seen_models: set = set()
    result = []
    # Prefer Delhi, fall back to first state found
    delhi_vehicles = [v for v in vehicles if v["brand"] == brand and v["state"] == "Delhi"]
    all_brand = [v for v in vehicles if v["brand"] == brand]

    for v in delhi_vehicles + all_brand:
        if v["model"] not in seen_models:
            seen_models.add(v["model"])
            result.append(v)
    return result


def build_llm_vehicle_context(brand: str = "Hyundai", customer_state=None) -> str:
    """
    Build a markdown table of vehicles for the LLM system prompt.
    Uses real Excel data — no hardcoded strings.
    If customer_state is provided, filters by budget/type/fuel/state.
    Falls back to all brand vehicles if filters return nothing.
    """
    vehicles = get_all_vehicles_from_excel()
    if not vehicles:
        return "Vehicle data not available."

    location = "Delhi"
    budget = None
    car_type = None
    fuel_type = None

    if customer_state:
        location = getattr(customer_state, "state", None) or "Delhi"
        car_type = getattr(customer_state, "car_type", None)
        fuel_type = getattr(customer_state, "fuel", None)
        try:
            budget = customer_state.get_budget_midpoint()
        except Exception:
            budget = None

    # Filter
    filtered = [v for v in vehicles if v["brand"] == brand]

    # Prefer location match
    loc_filtered = [v for v in filtered if v["state"].lower() == location.lower()]
    if loc_filtered:
        filtered = loc_filtered

    if budget:
        budget_filtered = [v for v in filtered if v.get("on_road_price", 9999) <= budget * 1.1]
        if budget_filtered:
            filtered = budget_filtered

    if car_type:
        type_filtered = [v for v in filtered if car_type.lower() in (v.get("car_type") or "").lower()]
        if type_filtered:
            filtered = type_filtered

    if fuel_type:
        fuel_filtered = [v for v in filtered if fuel_type.lower() in (v.get("fuel_type") or "").lower()]
        if fuel_filtered:
            filtered = fuel_filtered

    # Deduplicate by model
    seen: set = set()
    deduped = []
    for v in filtered:
        if v["model"] not in seen:
            seen.add(v["model"])
            deduped.append(v)
        if len(deduped) >= 10:
            break

    if not deduped:
        return "Vehicle data not available."

    lines = [f"| Brand | Model | Type | Fuel | Seats | On-Road (₹ Lakh, {location}) | Rating/5 |"]
    lines.append("|---|---|---|---|---|---|---|")
    for v in deduped:
        lines.append(
            f"| {v['brand']} | {v['model']} | {v.get('car_type', '')} | "
            f"{v.get('fuel_type', '')} | {v.get('seating_capacity', '')} | "
            f"₹{v.get('on_road_price', 'N/A')} | {v.get('rating', 'N/A')} |"
        )
    return "\n".join(lines)
