from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any

class VehicleResponse(BaseModel):
    id: str
    brand: str
    model: str
    car_type: Optional[str] = None
    seating_capacity: Optional[int] = None
    fuel_type: Optional[str] = None
    showroom_price: Optional[float] = None
    rating: Optional[float] = None
    state: Optional[str] = None
    other_charges: Optional[float] = None
    on_road_price: Optional[float] = None
    is_primary_brand: bool
    is_competitor: bool
    model_config = ConfigDict(from_attributes=True)

class VehicleComparisonResponse(BaseModel):
    vehicles: List[VehicleResponse]
    comparison_matrix: Dict[str, Any]
    summary: str

class VehicleRecommendationResponse(BaseModel):
    primary_recommendations: List[VehicleResponse]
    competitor_alternatives: List[VehicleResponse]
    reasoning: str
