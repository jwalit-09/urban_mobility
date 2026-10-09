from fastapi import APIRouter
from app.schemas.rag import RagQueryRequest, RagQueryResponse
from app.services.rag_service import rag_service

router = APIRouter(prefix="/rag", tags=["Vector Database & RAG Assistant"])

@router.post("/ask", response_model=RagQueryResponse)
async def ask_transit_assistant(req: RagQueryRequest):
    """
    RAG (Retrieval-Augmented Generation) AI Assistant (CO2, CO3):
    1. Embeds query into 128-dimensional dense vector.
    2. Performs cosine similarity search over policy & transit knowledge base.
    3. Fetches live database context (active traffic delays, routes, vehicles).
    4. Synthesizes a grounded, accurate multimodal answer.
    """
    result = rag_service.ask(query=req.query)
    return result

@router.get("/documents")
async def list_knowledge_documents():
    """List all indexed transit policy chunks with embedding metadata."""
    return [
        {
            "chunk_id": c["chunk_id"],
            "title": c["document_title"],
            "category": c["category"],
            "token_count": len(c["chunk_text"].split()),
            "embedding_dimensions": len(c["embedding"]),
            "sample_snippet": c["chunk_text"][:120] + "..."
        }
        for c in rag_service.chunks
    ]
