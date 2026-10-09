from fastapi import APIRouter
from app.api.v1.endpoints import auth, routes, vehicles, traffic, trips, ingestion, rag, gateway, lab

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(routes.router)
api_router.include_router(vehicles.router)
api_router.include_router(traffic.router)
api_router.include_router(trips.router)
api_router.include_router(ingestion.router)
api_router.include_router(rag.router)
api_router.include_router(gateway.router)
api_router.include_router(lab.router)
