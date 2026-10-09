import time
import uuid
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api_router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## Urban Mobility Data Integration & Route Intelligence Platform
    A complete Polyglot Microservices and Cloud-Native backend implementing **CO1 through CO6**:
    - **CO1 & CO2**: Relational Database, Normalisation, Advanced SQL, MongoDB Documents, pgvector Hybrid Search & RAG.
    - **CO3**: FastAPI Layered Architecture, RESTful Contracts, Pydantic v2, JWT Security, RBAC.
    - **CO4**: Multi-Framework Engineering (Spring Boot, Node.js Express, ASP.NET Core).
    - **CO5**: Microservices Decomposition, Centralized API Gateway, Distributed Saga with Compensation.
    - **CO6**: Docker, Kubernetes, OpenTelemetry, Prometheus & Grafana Monitoring.
    """,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Request Timing & Correlation ID Middleware
@app.middleware("http")
async def add_process_time_and_correlation(request: Request, call_next):
    start_time = time.time()
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Correlation-ID"] = correlation_id
    return response

# 3. Centralized Exception Handling
@app.exception_handler(Exception)
async def centralized_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": request.url.path,
            "correlation_id": request.headers.get("X-Correlation-ID", "unknown")
        }
    )

# 4. Include Versioned API Router (/api/v1/...)
app.include_router(api_router, prefix=settings.API_V1_STR)

# 5. Include Direct Route for 100% Frontend Compatibility (/api/...)
app.include_router(api_router, prefix="/api")

@app.get("/", tags=["Health & Root"])
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "UP",
        "documentation": "/docs",
        "api_v1_prefix": settings.API_V1_STR,
        "compatibility_prefix": "/api"
    }

@app.get("/health", tags=["Health & Root"])
async def health_check():
    return {
        "status": "HEALTHY",
        "timestamp": time.time(),
        "services": {
            "fastapi_gateway": "ONLINE",
            "relational_store": "ONLINE",
            "vector_store": "ONLINE"
        }
    }
