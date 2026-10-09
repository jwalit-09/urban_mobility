from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RagQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, example="What is the luggage policy on the Airport Express?")
    top_k: int = Field(default=3, ge=1, le=10)
    similarity_threshold: float = Field(default=0.15, ge=0.0, le=1.0)

class RagSourceItem(BaseModel):
    chunk_id: int
    document_title: str
    category: str
    chunk_text: str
    similarity_score: float

class RagQueryResponse(BaseModel):
    query: str
    answer: str
    confidence_score: float
    retrieved_sources: List[RagSourceItem]
    live_traffic_alerts: List[str]
    recommended_routes: List[Dict[str, Any]]
    timestamp: str
