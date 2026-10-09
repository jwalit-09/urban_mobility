from typing import Optional
from pydantic import BaseModel, Field

class DriverResponse(BaseModel):
    id: int
    name: str
    license_number: str
    phone: str
    rating: float = 5.0

    class Config:
        from_attributes = True

class VehicleCreate(BaseModel):
    vehicle_number: str = Field(..., example="TS09AB1234")
    type: str = Field(default="Bus")
    transit_mode: str = Field(default="BUS")
    capacity: int = Field(default=50, gt=0)
    driver_id: Optional[int] = None

class VehicleResponse(BaseModel):
    id: int
    vehicle_number: str
    type: str
    transit_mode: str = "BUS"
    capacity: int
    battery_or_fuel_pct: int = 100
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    status: str = "ACTIVE"
    driver: Optional[DriverResponse] = None

    class Config:
        from_attributes = True
