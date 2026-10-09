"""
Urban Mobility Platform - Data Store & Repositories (CO3)
Implements Layered Architecture: Repository Pattern with Clean Data Abstractions.
Supports Persistent In-Memory State with PostgreSQL/SQLite Schema Compatibility.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.security import hash_password

class MobilityDataStore:
    def __init__(self):
        self.users: List[Dict[str, Any]] = []
        self.drivers: List[Dict[str, Any]] = []
        self.vehicles: List[Dict[str, Any]] = []
        self.routes: List[Dict[str, Any]] = []
        self.trips: List[Dict[str, Any]] = []
        self.bookings: List[Dict[str, Any]] = []
        self.traffic_updates: List[Dict[str, Any]] = []
        self.telemetry_logs: List[Dict[str, Any]] = []
        self.audit_logs: List[Dict[str, Any]] = []
        self.seed_defaults()

    def seed_defaults(self):
        # 1. Seed Users
        self.users = [
            {
                "id": 1,
                "email": "admin@mobility.com",
                "password_hash": hash_password("admin123"),
                "role": "ADMIN",
                "first_name": "Admin",
                "last_name": "Controller",
                "phone": "9000000000",
                "is_active": True
            },
            {
                "id": 2,
                "email": "user@mobility.com",
                "password_hash": hash_password("user123"),
                "role": "PASSENGER",
                "first_name": "City",
                "last_name": "Commuter",
                "phone": "9000000009",
                "is_active": True
            }
        ]

        # 2. Seed Drivers
        self.drivers = [
            {"id": 1, "name": "Ravi Kumar", "license_number": "DL-TS-1001", "phone": "9000000001", "rating": 4.9},
            {"id": 2, "name": "Anil Sharma", "license_number": "DL-TS-1002", "phone": "9000000002", "rating": 4.8}
        ]

        # 3. Seed Vehicles
        self.vehicles = [
            {
                "id": 1,
                "vehicle_number": "TS09AB1234",
                "type": "Bus",
                "transit_mode": "BUS",
                "capacity": 50,
                "battery_or_fuel_pct": 90,
                "current_latitude": 17.3850,
                "current_longitude": 78.4867,
                "status": "ACTIVE",
                "driver": self.drivers[0]
            },
            {
                "id": 2,
                "vehicle_number": "TS09CD5678",
                "type": "Electric Bus",
                "transit_mode": "ELECTRIC_BUS",
                "capacity": 40,
                "battery_or_fuel_pct": 78,
                "current_latitude": 17.4400,
                "current_longitude": 78.3800,
                "status": "ACTIVE",
                "driver": self.drivers[1]
            }
        ]

        # 4. Seed Routes & Stops
        self.routes = [
            {
                "id": 1,
                "name": "Airport Express",
                "source": "Central Station",
                "destination": "Airport",
                "distance_km": 18.0,
                "base_minutes": 35,
                "base_fare": 55.0,
                "co2_grams_per_km": 65.0,
                "transit_mode": "BUS",
                "stops": [
                    {"id": 1, "name": "Central Station", "sequence_no": 1},
                    {"id": 2, "name": "City Mall", "sequence_no": 2},
                    {"id": 3, "name": "Tech Park", "sequence_no": 3},
                    {"id": 4, "name": "Airport", "sequence_no": 4}
                ]
            },
            {
                "id": 2,
                "name": "Metro Connector",
                "source": "Central Station",
                "destination": "Airport",
                "distance_km": 21.0,
                "base_minutes": 42,
                "base_fare": 60.0,
                "co2_grams_per_km": 30.0,
                "transit_mode": "ELECTRIC_BUS",
                "stops": [
                    {"id": 5, "name": "Central Station", "sequence_no": 1},
                    {"id": 6, "name": "Lake View", "sequence_no": 2},
                    {"id": 7, "name": "Tech Park", "sequence_no": 3},
                    {"id": 8, "name": "Airport", "sequence_no": 4}
                ]
            }
        ]

        # 5. Seed Traffic Updates
        self.traffic_updates = [
            {
                "id": 1,
                "route_id": 1,
                "route": {"id": 1, "name": "Airport Express"},
                "severity": "HIGH",
                "delay_minutes": 12,
                "message": "Heavy traffic near City Mall",
                "is_active": True,
                "reported_at": datetime.now().isoformat()
            },
            {
                "id": 2,
                "route_id": 2,
                "route": {"id": 2, "name": "Metro Connector"},
                "severity": "LOW",
                "delay_minutes": 2,
                "message": "Normal traffic along Lake View bypass",
                "is_active": True,
                "reported_at": datetime.now().isoformat()
            }
        ]

        # 6. Seed Trips
        self.trips = [
            {
                "id": 1,
                "route_id": 1,
                "vehicle_id": 1,
                "driver_id": 1,
                "departure_time": datetime.now().isoformat(),
                "arrival_time": None,
                "status": "SCHEDULED",
                "available_seats": 45,
                "fare_multiplier": 1.0
            }
        ]

    # --- User Repository Methods ---
    def find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        for u in self.users:
            if u["email"].lower() == email.lower():
                return u
        return None

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        new_id = max([u["id"] for u in self.users], default=0) + 1
        user_data["id"] = new_id
        self.users.append(user_data)
        return user_data

    # --- Route Repository Methods ---
    def get_all_routes(self) -> List[Dict[str, Any]]:
        return self.routes

    def get_route_by_id(self, route_id: int) -> Optional[Dict[str, Any]]:
        for r in self.routes:
            if r["id"] == route_id:
                return r
        return None

    def create_route(self, r_data: Dict[str, Any]) -> Dict[str, Any]:
        new_id = max([r["id"] for r in self.routes], default=0) + 1
        r_data["id"] = new_id
        self.routes.append(r_data)
        return r_data

    def delete_route(self, route_id: int) -> bool:
        initial = len(self.routes)
        self.routes = [r for r in self.routes if r["id"] != route_id]
        return len(self.routes) < initial

    # --- Vehicle Repository Methods ---
    def get_all_vehicles(self) -> List[Dict[str, Any]]:
        return self.vehicles

    def update_vehicle_coords(self, veh_num: str, lat: float, lng: float):
        for v in self.vehicles:
            if v["vehicle_number"] == veh_num:
                v["current_latitude"] = lat
                v["current_longitude"] = lng
                return v
        return None

    # --- Traffic Repository Methods ---
    def get_all_traffic(self) -> List[Dict[str, Any]]:
        return self.traffic_updates

    # --- Trip & Booking Repository Methods ---
    def get_all_trips(self) -> List[Dict[str, Any]]:
        return self.trips

    def book_seats(self, trip_id: int, user_id: int, seats: int) -> Optional[Dict[str, Any]]:
        for t in self.trips:
            if t["id"] == trip_id:
                if t["available_seats"] >= seats:
                    t["available_seats"] -= seats
                    booking_id = len(self.bookings) + 1
                    ref = f"BK-FASTAPI-{booking_id:04d}"
                    booking = {
                        "id": booking_id,
                        "booking_reference": ref,
                        "user_id": user_id,
                        "trip_id": trip_id,
                        "seat_count": seats,
                        "total_amount": seats * 35.0,
                        "status": "CONFIRMED",
                        "saga_state": "COMPLETED",
                        "created_at": datetime.now()
                    }
                    self.bookings.append(booking)
                    return booking
        return None

    def compensate_booking(self, booking_ref: str) -> bool:
        """Rollback seats on distributed Saga failure."""
        for b in self.bookings:
            if b["booking_reference"] == booking_ref and b["status"] != "CANCELLED":
                b["status"] = "CANCELLED"
                b["saga_state"] = "SAGA_COMPENSATED"
                for t in self.trips:
                    if t["id"] == b["trip_id"]:
                        t["available_seats"] += b["seat_count"]
                return True
        return False

# Singleton data store instance
data_store = MobilityDataStore()
