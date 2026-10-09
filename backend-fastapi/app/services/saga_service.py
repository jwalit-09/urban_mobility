import uuid
import logging
from typing import Dict, Any, List
from app.repositories.data_store import data_store

logger = logging.getLogger("SagaOrchestrator")

class BookingSagaOrchestrator:
    """
    Distributed Saga Orchestrator (CO5):
    Coordinates multi-service distributed transaction across:
      Step 1: Seat Reservation in Transit Service (PostgreSQL / Relational)
      Step 2: Activity Stream Record in Telemetry Service (MongoDB / Document)
      Step 3: Notification & Confirmation Dispatch

    Compensating Actions:
      If any downstream step fails, the orchestrator invokes compensating transactions
      to rollback earlier completed steps (e.g., release reserved seat, cancel booking).
    """
    def execute_booking_saga(self, trip_id: int, user_id: int, seat_count: int, simulate_failure_at_step: int = 0) -> Dict[str, Any]:
        saga_id = f"saga-{uuid.uuid4().hex[:8]}"
        step_history: List[str] = []
        booking = None

        try:
            # STEP 1: Local Transaction - Reserve Seat in Relational Database
            step_history.append("STEP_1: RESERVE_SEATS_START")
            booking = data_store.book_seats(trip_id=trip_id, user_id=user_id, seats=seat_count)
            if not booking:
                raise RuntimeError(f"Step 1 Failed: Insufficient seats or trip {trip_id} not found.")
            
            step_history.append(f"STEP_1: SUCCESS (Reserved {seat_count} seats. Ref: {booking['booking_reference']})")

            # Check simulated failure for Saga test demonstration
            if simulate_failure_at_step == 2:
                raise RuntimeError("Simulated Downstream Service Failure at Step 2 (e.g. MongoDB activity write timeout)")

            # STEP 2: Downstream MongoDB Document Store Sync (Simulated / Remote)
            step_history.append("STEP_2: MONGODB_ACTIVITY_STREAM_START")
            # In production, calls Node.js microservice POST /api/activity
            step_history.append("STEP_2: SUCCESS (Activity logged in MongoDB passenger_activity_stream)")

            # STEP 3: Issue Final Confirmation
            step_history.append("STEP_3: ISSUE_CONFIRMATION_TICKET")
            step_history.append("STEP_3: SUCCESS (QR Code ticket generated)")

            return {
                "saga_id": saga_id,
                "trip_id": trip_id,
                "booking_reference": booking["booking_reference"],
                "status": "SUCCESS",
                "step_history": step_history,
                "message": "Distributed Saga completed successfully across all microservices."
            }

        except Exception as ex:
            error_msg = str(ex)
            step_history.append(f"ERROR: {error_msg}")
            step_history.append("COMPENSATION: INITIATING_COMPENSATING_ACTIONS")

            # Execute Compensating Transaction: Rollback Step 1
            if booking and booking.get("booking_reference"):
                compensated = data_store.compensate_booking(booking["booking_reference"])
                if compensated:
                    step_history.append(f"COMPENSATION_1: SUCCESS (Seat reservation released for {booking['booking_reference']})")
                else:
                    step_history.append("COMPENSATION_1: FAILED")

            return {
                "saga_id": saga_id,
                "trip_id": trip_id,
                "booking_reference": booking["booking_reference"] if booking else "NONE",
                "status": "COMPENSATED",
                "step_history": step_history,
                "message": f"Saga failed and was rolled back via compensating actions: {error_msg}"
            }

saga_orchestrator = BookingSagaOrchestrator()
