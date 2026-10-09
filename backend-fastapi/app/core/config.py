import os
from typing import List

class Settings:
    PROJECT_NAME: str = "Urban Mobility Platform API Gateway & Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("JWT_SECRET", "UrbanMobilityDemoSecretKeyForJWTAuthenticationChangeMe123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours

    # Database URLs
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:ENABLES04$@localhost:5432/urban_mobility")
    SQLITE_FALLBACK_URL: str = "sqlite+aiosqlite:///./urban_mobility_dev.db"
    
    # MongoDB URL
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = "urban_mobility_nosql"
    
    # Redis URL
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Microservice Downstream URLs (CO5)
    SPRING_BOOT_URL: str = os.getenv("SPRING_BOOT_URL", "http://localhost:8080")
    NODE_SERVICE_URL: str = os.getenv("NODE_SERVICE_URL", "http://localhost:5000")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
