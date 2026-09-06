import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import init_db, SessionLocal
from app.models.showroom import Showroom
from app.models.car import Car

from app.routers import (
    showroom, cars, conversation, lead, scoring, negotiation, escalation, vehicles, agora, demo
)

app = FastAPI(title="AI Showroom Sales Executive API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_db():
    db = SessionLocal()
    try:
        if db.query(Showroom).count() == 0:
            showroom_path = os.path.join(os.path.dirname(__file__), "../data/showroom.json")
            if not os.path.exists(showroom_path):
                showroom_path = os.path.join(os.path.dirname(__file__), "../../data/showroom.json")
            if os.path.exists(showroom_path):
                with open(showroom_path, "r", encoding="utf-8") as f:
                    showroom_data = json.load(f)
                    for s in showroom_data:
                        db.add(Showroom(**s))
            else:
                db.add(Showroom(
                    id="HYD-DEL-001",
                    name="Hyundai Connaught Place",
                    city="New Delhi",
                    address="N-1, Connaught Place, New Delhi",
                    sales_executive="Rajesh Kumar",
                    phone="+91-11-4567-8900",
                    active=True
                ))
            
        if db.query(Car).count() == 0:
            cars_path = os.path.join(os.path.dirname(__file__), "../data/cars.json")
            if not os.path.exists(cars_path):
                cars_path = os.path.join(os.path.dirname(__file__), "../../data/cars.json")
            if os.path.exists(cars_path):
                with open(cars_path, "r", encoding="utf-8") as f:
                    car_data = json.load(f)
                    for c in car_data:
                        db.add(Car(**c))
            else:
                sample_cars = [
                    Car(model_name="Creta", variant="S Plus", body_type="SUV", fuel_type="Petrol", transmission="Manual", price_min=10.0, price_max=15.0, mileage="17.4 kmpl", engine_cc=1497, seating_capacity=5, colors=["White", "Black"], features=["Sunroof"]),
                    Car(model_name="Verna", variant="SX", body_type="Sedan", fuel_type="Petrol", transmission="Automatic", price_min=11.0, price_max=17.0, mileage="18.0 kmpl", engine_cc=1497, seating_capacity=5, colors=["Red", "Silver"], features=["ADAS"]),
                    Car(model_name="i20", variant="Asta", body_type="Hatchback", fuel_type="Petrol", transmission="Manual", price_min=7.0, price_max=11.0, mileage="20.0 kmpl", engine_cc=1197, seating_capacity=5, colors=["Blue", "Grey"], features=["Touchscreen"])
                ]
                db.add_all(sample_cars)
                
        db.commit()
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db()
    seed_db()

app.include_router(showroom.router, prefix="/api")
app.include_router(cars.router, prefix="/api")
app.include_router(conversation.router, prefix="/api")
app.include_router(lead.router, prefix="/api")
app.include_router(scoring.router, prefix="/api")
app.include_router(negotiation.router, prefix="/api")
app.include_router(escalation.router, prefix="/api")
app.include_router(vehicles.router, prefix="/api")
app.include_router(agora.router, prefix="/api")
app.include_router(demo.router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok", "message": "AI Showroom Sales Executive API"}

@app.get("/api/health")
def health():
    return {"status": "healthy", "llm_provider": settings.LLM_PROVIDER}
