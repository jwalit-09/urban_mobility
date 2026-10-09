from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.trip import TripResponse, BookingRequest, SagaBookingStatus
from app.core.dependencies import get_current_user
from app.repositories.data_store import data_store
from app.services.saga_service import saga_orchestrator

router = APIRouter(prefix="/trips", tags=["Trips & Distributed Saga Transactions"])

@router.get("", response_model=List[TripResponse])
async def get_all_trips():
    """List all scheduled and active transit trips."""
    return data_store.get_all_trips()

@router.post("/saga/book", response_model=SagaBookingStatus)
async def book_trip_with_saga(
    booking_in: BookingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Executes Distributed Saga Transaction (CO5):
    Coordinates seat reservation in PostgreSQL, activity logging in MongoDB,
    and ticket generation with automated compensation on failure.
    """
    res = saga_orchestrator.execute_booking_saga(
        trip_id=booking_in.trip_id,
        user_id=current_user["user_id"],
        seat_count=booking_in.seat_count,
        simulate_failure_at_step=0
    )
    return res

@router.post("/saga/simulate-failure", response_model=SagaBookingStatus)
async def simulate_saga_failure(
    booking_in: BookingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Simulates a failure in step 2 of the Saga to demonstrate
    AUTOMATED COMPENSATING TRANSACTIONS and rollback of seat reservations!
    """
    res = saga_orchestrator.execute_booking_saga(
        trip_id=booking_in.trip_id,
        user_id=current_user["user_id"],
        seat_count=booking_in.seat_count,
        simulate_failure_at_step=2
    )
    return res
