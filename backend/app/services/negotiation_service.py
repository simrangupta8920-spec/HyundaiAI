from sqlalchemy.orm import Session
from app.models.car import Car
from app.models.negotiation import NegotiationOffer

def process_offer(car_id: int, customer_offer: float, round_number: int, db: Session) -> dict:
    car = db.query(Car).filter(Car.id == car_id).first()
    if not car:
        return {"counter_price": None, "discount": 0, "message": "Car not found", "status": "rejected"}
        
    price_min = car.price_min
    
    if customer_offer >= price_min:
        return {
            "counter_price": customer_offer, 
            "discount": 0, 
            "message": "We accept your offer! We will also include a complimentary accessory pack.", 
            "status": "accepted"
        }
        
    if customer_offer >= price_min * 0.92:
        return {
            "counter_price": price_min, 
            "discount": ((price_min - customer_offer) / price_min) * 100, 
            "message": "That's a bit low, but we can offer the car at the minimum price and include free accessories.", 
            "status": "countered"
        }
        
    if customer_offer >= price_min * 0.85:
        counter = price_min * 0.96
        return {
            "counter_price": counter, 
            "discount": 4.0, 
            "message": "We can't go that low, but we can offer a special 4% discount.", 
            "status": "countered"
        }
        
    return {
        "counter_price": None, 
        "discount": 0, 
        "message": "We cannot accept this offer. The vehicle offers immense value, but we can explore EMI options if that helps.", 
        "status": "rejected"
    }
