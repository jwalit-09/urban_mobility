from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter
from app.repositories.data_store import data_store

router = APIRouter(prefix="/traffic", tags=["Traffic & Congestion Monitoring"])

@router.get("")
async def get_all_traffic():
    """List all real-time traffic condition updates."""
    return data_store.get_all_traffic()

@router.post("")
async def report_traffic(update_in: Dict[str, Any]):
    """Report dynamic traffic congestion on a transit corridor."""
    new_id = len(data_store.traffic_updates) + 1
    record = {
        "id": new_id,
        "route_id": update_in.get("routeId", 1),
        "route": {"id": update_in.get("routeId", 1), "name": update_in.get("routeName", "Airport Express")},
        "severity": update_in.get("severity", "MEDIUM"),
        "delay_minutes": update_in.get("delayMinutes", 5),
        "message": update_in.get("message", "Traffic reported"),
        "is_active": True,
        "reported_at": datetime.now().isoformat()
    }
    data_store.traffic_updates.append(record)
    return record
