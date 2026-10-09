from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class TripCreate(BaseModel):
    route_id: int
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    departure_time: datetime
    available_seats: int = Field(gt=0)
    fare_multiplier: float = Field(default=1.0, ge=0.5)

class TripResponse(BaseModel):
    id: int
    route_id: int
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    departure_time: datetime
    arrival_time: Optional[datetime] = None
    status: str
    available_seats: int
    fare_multiplier: float

    class Config:
        from_attributes = True

class BookingRequest(BaseModel):
    trip_id: int
    seat_count: int = Field(default=1, gt=0, le=10)

class BookingResponse(BaseModel):
    id: int
    booking_reference: str
    user_id: int
    trip_id: int
    seat_count: int
    total_amount: float
    status: str
    saga_state: str
    created_at: datetime

    class Config:
        from_attributes = True

class SagaBookingStatus(BaseModel):
    saga_id: str
    trip_id: int
    booking_reference: str
    status: str # SUCCESS, COMPENSATED, FAILED
    step_history: list[str]
    message: str
