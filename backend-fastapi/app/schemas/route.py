from typing import List, Optional
from pydantic import BaseModel, Field

class StopSchema(BaseModel):
    id: Optional[int] = None
    name: str
    sequence_no: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class RouteCreate(BaseModel):
    name: str = Field(..., example="Airport Express")
    source: str = Field(..., example="Central Station")
    destination: str = Field(..., example="Airport")
    distance_km: float = Field(..., gt=0, example=18.0)
    base_minutes: int = Field(..., gt=0, example=35)
    base_fare: float = Field(default=20.0, ge=0)
    co2_grams_per_km: float = Field(default=65.0, ge=0)
    transit_mode: str = Field(default="BUS")
    stops: Optional[List[str]] = None

class RouteResponse(BaseModel):
    id: int
    name: str
    source: str
    destination: str
    distance_km: float
    base_minutes: int
    base_fare: float = 20.0
    co2_grams_per_km: float = 65.0
    transit_mode: str = "BUS"
    stops: List[StopSchema] = []

    class Config:
        from_attributes = True

class RouteCalculateRequest(BaseModel):
    source: str = Field(..., example="Central Station")
    destination: str = Field(..., example="Airport")
    preferred_mode: Optional[str] = None

class RouteCalculateResponse(BaseModel):
    source: str
    destination: str
    estimated_minutes: int
    distance_km: float
    stops: List[str]
    traffic_delay_minutes: int
    traffic_severity: str
    co2_saved_grams: float
    fare: float
    algorithm: str
