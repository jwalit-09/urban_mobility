-- ============================================================================
-- URBAN MOBILITY PLATFORM - VECTOR DATABASE & HYBRID SEARCH (CO2)
-- Topics: Vector Foundations, Embeddings, Similarity Metrics, ANN (HNSW/IVF),
-- pgvector Implementation, Hybrid Search & RAG
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VECTOR DATABASE FOUNDATIONS & EXTENSION SETUP
-- ----------------------------------------------------------------------------

-- Enable pgvector in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- Inspect vector extension version
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Table for Semantic Transit Documents with Vector Embeddings (128 Dimensions)
CREATE TABLE IF NOT EXISTS transit_knowledge_vectors (
    id BIGSERIAL PRIMARY KEY,
    document_title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    chunk_index INT NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding vector(128) NOT NULL,            -- Dense vector (128-dim dense embedding)
    tsv_content tsvector,                      -- Sparse lexical token vector for BM25
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to automatically populate tsvector for Full-Text Search
CREATE OR REPLACE FUNCTION fn_update_chunk_tsv()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.tsv_content := to_tsvector('english', COALESCE(NEW.document_title, '') || ' ' || COALESCE(NEW.chunk_content, ''));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chunk_tsv ON transit_knowledge_vectors;
CREATE TRIGGER trg_chunk_tsv
BEFORE INSERT OR UPDATE ON transit_knowledge_vectors
FOR EACH ROW EXECUTE FUNCTION fn_update_chunk_tsv();

-- ----------------------------------------------------------------------------
-- 2. INDEX DESIGN: ANN (APPROXIMATE NEAREST NEIGHBOR)
-- ----------------------------------------------------------------------------

-- A. HNSW (Hierarchical Navigable Small World) Index
-- Best for high recall, fast queries, low-latency production serving
CREATE INDEX IF NOT EXISTS idx_vectors_hnsw_cosine
ON transit_knowledge_vectors
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- B. IVFFlat (Inverted File Flat) Index Alternative
-- Best for massive scale with cluster partitions (requires training data)
-- CREATE INDEX idx_vectors_ivfflat ON transit_knowledge_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-Text GIN Index for hybrid search
CREATE INDEX IF NOT EXISTS idx_vectors_tsv ON transit_knowledge_vectors USING gin(tsv_content);

-- ----------------------------------------------------------------------------
-- 3. SIMILARITY METRICS & VECTOR SEARCH QUERIES
-- ----------------------------------------------------------------------------

/*
pgvector Operators:
  <=> : Cosine distance (1 - cosine_similarity). Lower is closer.
  <-> : Euclidean distance (L2 distance).
  <#> : Negative inner product / dot product.
*/

-- Example 1: Pure Semantic Similarity Search (Top-3 nearest neighbors)
-- Query embedding represented as a sample 128-dimensional vector
-- SELECT 
--     id,
--     document_title,
--     category,
--     chunk_content,
--     1 - (embedding <=> '[0.05, 0.12, -0.08, ...]'::vector) AS cosine_similarity
-- FROM transit_knowledge_vectors
-- ORDER BY embedding <=> '[0.05, 0.12, -0.08, ...]'::vector ASC
-- LIMIT 3;

-- ----------------------------------------------------------------------------
-- 4. HYBRID SEARCH: DENSE VECTOR (SEMANTIC) + SPARSE LEXICAL (BM25)
-- ----------------------------------------------------------------------------

/*
Hybrid Search combines the best of both worlds:
1. Dense Vector Search: Understands synonyms, intent, and paraphrasing.
2. Sparse Lexical Search: Excels at exact keywords, code words, model numbers (e.g. 'TS09CD5678').
Formula: Hybrid_Score = (alpha * dense_score) + ((1 - alpha) * sparse_score)
*/

-- Combined Hybrid Search Function
CREATE OR REPLACE FUNCTION fn_hybrid_transit_search(
    p_query_text TEXT,
    p_query_vector vector(128),
    p_alpha NUMERIC DEFAULT 0.65, -- 65% weight on semantic, 35% on keyword
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    id BIGINT,
    document_title VARCHAR(255),
    category VARCHAR(100),
    chunk_content TEXT,
    dense_similarity NUMERIC,
    sparse_score NUMERIC,
    hybrid_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH DenseResults AS (
        SELECT 
            tkv.id,
            tkv.document_title,
            tkv.category,
            tkv.chunk_content,
            ROUND((1 - (tkv.embedding <=> p_query_vector))::NUMERIC, 4) AS dense_sim
        FROM transit_knowledge_vectors tkv
        ORDER BY tkv.embedding <=> p_query_vector ASC
        LIMIT 20
    ),
    SparseResults AS (
        SELECT 
            tkv.id,
            ROUND(ts_rank_cd(tkv.tsv_content, plainto_tsquery('english', p_query_text))::NUMERIC, 4) AS lexical_score
        FROM transit_knowledge_vectors tkv
        WHERE tkv.tsv_content @@ plainto_tsquery('english', p_query_text)
        LIMIT 20
    )
    SELECT 
        d.id,
        d.document_title,
        d.category,
        d.chunk_content,
        d.dense_sim,
        COALESCE(s.lexical_score, 0.0) AS sparse_score,
        ROUND(((p_alpha * d.dense_sim) + ((1.0 - p_alpha) * COALESCE(s.lexical_score, 0.0)))::NUMERIC, 4) AS hybrid_score
    FROM DenseResults d
    LEFT JOIN SparseResults s ON d.id = s.id
    ORDER BY hybrid_score DESC
    LIMIT p_limit;
END;
$$;
