from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.schemas.vehicle import VehicleResponse, VehicleComparisonResponse, VehicleRecommendationResponse
from app.services.vehicle_service import (
    get_all_vehicles,
    get_vehicle_by_id,
    search_vehicles,
    compare_vehicles,
    recommend_vehicles
)

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

@router.get("", response_model=List[VehicleResponse])
def list_vehicles(
    state: Optional[str] = Query(None, description="Filter by state (e.g. Delhi, Maharashtra)"),
    limit: Optional[int] = Query(None, description="Max results limit"),
    offset: int = Query(0, description="Offset")
):
    return get_all_vehicles(state=state, limit=limit, offset=offset)

@router.get("/search", response_model=List[VehicleResponse])
def search_vehicles_endpoint(
    brand: Optional[str] = Query(None, description="Brand name (e.g. Hyundai, Tata Motors, Maruti Suzuki)"),
    model: Optional[str] = Query(None, description="Model name (e.g. Creta, Nexon, Brezza)"),
    budget: Optional[float] = Query(None, description="Max budget in Lakhs"),
    car_type: Optional[str] = Query(None, description="Car body type (e.g. SUV, Hatchback, Sedan)"),
    fuel_type: Optional[str] = Query(None, description="Fuel type (e.g. Petrol, Diesel, Electric, CNG)"),
    seating_capacity: Optional[int] = Query(None, description="Seating capacity (e.g. 5, 7)"),
    state: Optional[str] = Query(None, description="State (e.g. Delhi, Maharashtra)")
):
    return search_vehicles(
        brand=brand,
        model=model,
        budget=budget,
        car_type=car_type,
        fuel_type=fuel_type,
        seating_capacity=seating_capacity,
        state=state
    )

@router.get("/compare", response_model=VehicleComparisonResponse)
def compare_vehicles_endpoint(
    ids: str = Query(..., description="Comma-separated vehicle IDs (e.g. hyundai_creta_delhi,tata_nexon_delhi,maruti_brezza_delhi)")
):
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if not id_list:
        raise HTTPException(status_code=400, detail="At least one vehicle ID must be provided for comparison")
    return compare_vehicles(id_list)

@router.get("/recommend", response_model=VehicleRecommendationResponse)
def recommend_vehicles_endpoint(
    budget: Optional[float] = Query(None, description="Max budget in Lakhs"),
    car_type: Optional[str] = Query(None, description="Car body type (e.g. SUV)"),
    fuel_type: Optional[str] = Query(None, description="Fuel type (e.g. Petrol, Electric)"),
    seating_capacity: Optional[int] = Query(None, description="Seating capacity (e.g. 5, 7)"),
    state: Optional[str] = Query(None, description="State (e.g. Delhi)"),
    include_competitors: bool = Query(False, description="Set True if customer explicitly requested competitor models")
):
    return recommend_vehicles(
        budget=budget,
        car_type=car_type,
        fuel_type=fuel_type,
        seating_capacity=seating_capacity,
        state=state,
        include_competitors=include_competitors
    )

@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle_endpoint(vehicle_id: str):
    vehicle = get_vehicle_by_id(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")
    return vehicle
