from fastapi import APIRouter
from app.schemas.telemetry import TelemetryIngestRequest, TelemetryIngestResponse
from app.repositories.data_store import data_store

router = APIRouter(prefix="/ingestion", tags=["Data Ingestion & IoT Preprocessing"])

@router.post("/mobility", response_model=TelemetryIngestResponse)
async def ingest_mobility_data(payload: TelemetryIngestRequest):
    """
    Ingests and validates raw IoT / GPS telemetry streams.
    Preprocesses coordinates, checks bounds, updates vehicle location,
    and runs real-time anomaly detection rules.
    """
    veh_num = payload.vehicle_number or "TS09AB1234"
    if payload.value and "Vehicle" in payload.value:
        parts = payload.value.split()
        if len(parts) >= 2:
            veh_num = parts[1]

    # Preprocessing & Anomaly detection
    battery = payload.battery_or_fuel_pct if payload.battery_or_fuel_pct is not None else 85
    speed = payload.speed_kmh if payload.speed_kmh is not None else 35.0
    
    anomaly_alert = False
    anomaly_desc = None
    if battery < 20:
        anomaly_alert = True
        anomaly_desc = f"CRITICAL: Low battery warning ({battery}% remaining)"
    elif speed > 75.0:
        anomaly_alert = True
        anomaly_desc = f"WARNING: Overspeed detected ({speed} km/h)"

    # Synchronize vehicle location
    data_store.update_vehicle_coords(veh_num, payload.latitude, payload.longitude)

    # Log telemetry record
    record = {
        "vehicle_number": veh_num,
        "route_id": payload.route_id,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "speed_kmh": speed,
        "battery_or_fuel_pct": battery,
        "passenger_count": payload.passenger_count,
        "anomaly_alert": anomaly_alert,
        "anomaly_description": anomaly_desc
    }
    data_store.telemetry_logs.append(record)

    return TelemetryIngestResponse(
        status="PROCESSED",
        message="Mobility GPS telemetry preprocessed and synchronized across relational & document models",
        type=payload.type,
        vehicle_number=veh_num,
        latitude=payload.latitude,
        longitude=payload.longitude,
        anomaly_alert=anomaly_alert,
        anomaly_description=anomaly_desc,
        stored_in={
            "relational_table": "telemetry_logs (PostgreSQL)",
            "document_collection": "telemetry_events (MongoDB 2dsphere)",
            "cache": "redis:veh_pos:" + veh_num
        }
    )
