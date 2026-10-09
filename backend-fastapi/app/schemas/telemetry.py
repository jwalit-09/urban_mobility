from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class TelemetryIngestRequest(BaseModel):
    type: str = Field(default="GPS")
    value: Optional[str] = None
    vehicle_number: Optional[str] = Field(default="TS09AB1234")
    route_id: Optional[int] = Field(default=1)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    speed_kmh: Optional[float] = Field(default=35.0, ge=0.0)
    battery_or_fuel_pct: Optional[int] = Field(default=85, ge=0, le=100)
    passenger_count: Optional[int] = Field(default=24, ge=0)

class TelemetryIngestResponse(BaseModel):
    status: str
    message: str
    type: str
    vehicle_number: str
    latitude: float
    longitude: float
    anomaly_alert: bool
    anomaly_description: Optional[str] = None
    stored_in: Dict[str, str]
