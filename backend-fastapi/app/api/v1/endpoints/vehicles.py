from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from app.schemas.vehicle import VehicleResponse, VehicleCreate
from app.core.dependencies import require_role
from app.repositories.data_store import data_store

router = APIRouter(prefix="/vehicles", tags=["Fleet & Vehicles"])

@router.get("", response_model=List[VehicleResponse])
async def get_all_vehicles():
    """List all transit fleet vehicles with assigned drivers."""
    return data_store.get_all_vehicles()

@router.post("", response_model=VehicleResponse)
async def create_vehicle(
    v_in: VehicleCreate,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN", "OPERATOR"]))
):
    """Admin-only: Register a new fleet vehicle."""
    new_v = {
        "id": len(data_store.vehicles) + 1,
        "vehicle_number": v_in.vehicle_number,
        "type": v_in.type,
        "transit_mode": v_in.transit_mode,
        "capacity": v_in.capacity,
        "battery_or_fuel_pct": 100,
        "status": "ACTIVE",
        "driver": None
    }
    data_store.vehicles.append(new_v)
    return new_v
