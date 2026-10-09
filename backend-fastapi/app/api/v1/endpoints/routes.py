from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.route import RouteCreate, RouteResponse, RouteCalculateRequest, RouteCalculateResponse
from app.core.dependencies import get_current_user, require_role
from app.repositories.data_store import data_store
from app.services.route_service import route_engine

router = APIRouter(prefix="/routes", tags=["Routes & Network Navigation"])

@router.get("", response_model=List[RouteResponse])
async def get_all_routes():
    """List all transit routes stored in the database."""
    return data_store.get_all_routes()

@router.get("/{route_id}", response_model=RouteResponse)
async def get_route(route_id: int):
    route = data_store.get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

@router.post("", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
async def create_route(
    route_in: RouteCreate,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN", "OPERATOR"]))
):
    """Admin-only: Create a new transit route with stops."""
    stops_data = []
    if route_in.stops:
        for idx, stop_name in enumerate(route_in.stops):
            stops_data.append({"id": idx + 1, "name": stop_name, "sequence_no": idx + 1})
    
    new_route = {
        "name": route_in.name,
        "source": route_in.source,
        "destination": route_in.destination,
        "distance_km": route_in.distance_km,
        "base_minutes": route_in.base_minutes,
        "base_fare": route_in.base_fare,
        "co2_grams_per_km": route_in.co2_grams_per_km,
        "transit_mode": route_in.transit_mode,
        "stops": stops_data
    }
    created = data_store.create_route(new_route)
    return created

@router.delete("/{route_id}")
async def delete_route(
    route_id: int,
    current_user: Dict[str, Any] = Depends(require_role(["ADMIN"]))
):
    """Admin-only: Delete transit route."""
    deleted = data_store.delete_route(route_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted successfully", "id": route_id}

@router.post("/calculate", response_model=RouteCalculateResponse)
async def calculate_route(calc_in: RouteCalculateRequest):
    """Calculates shortest path using Dijkstra algorithm with dynamic traffic cost."""
    routes = data_store.get_all_routes()
    traffic = data_store.get_all_traffic()
    res = route_engine.calculate_optimal_route(
        routes=routes,
        traffic_list=traffic,
        source=calc_in.source,
        destination=calc_in.destination
    )
    return res
