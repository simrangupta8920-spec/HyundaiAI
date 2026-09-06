from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.car import Car
from app.schemas.car import CarResponse, CarRecommendRequest, CarRecommendResponse
from app.services.llm.provider_factory import get_llm_provider

router = APIRouter(prefix="/cars", tags=["cars"])

@router.get("", response_model=List[CarResponse])
def get_cars(body_type: str = None, fuel_type: str = None, budget_max: float = None, db: Session = Depends(get_db)):
    query = db.query(Car)
    if body_type:
        query = query.filter(Car.body_type.ilike(f"%{body_type}%"))
    if fuel_type:
        query = query.filter(Car.fuel_type.ilike(f"%{fuel_type}%"))
    if budget_max:
        query = query.filter(Car.price_min <= budget_max)
    return query.all()

@router.get("/{car_id}", response_model=CarResponse)
def get_car(car_id: int, db: Session = Depends(get_db)):
    car = db.query(Car).filter(Car.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car

@router.post("/recommend", response_model=CarRecommendResponse)
def recommend_cars(req: CarRecommendRequest, db: Session = Depends(get_db)):
    query = db.query(Car)
    if req.budget_max: query = query.filter(Car.price_min <= req.budget_max)
    if req.budget_min: query = query.filter(Car.price_max >= req.budget_min)
    if req.fuel_type: query = query.filter(Car.fuel_type.ilike(f"%{req.fuel_type}%"))
    if req.body_type: query = query.filter(Car.body_type.ilike(f"%{req.body_type}%"))
    
    cars = query.all()
    provider = get_llm_provider()
    
    prompt = f"User wants {req.body_type} running on {req.fuel_type} for {req.use_case} within {req.budget_max} Lakhs. Recommending {len(cars)} cars."
    reply = provider.chat([{"role": "user", "content": prompt}])
    
    return CarRecommendResponse(cars=cars, reasoning=reply)
