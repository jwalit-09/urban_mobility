# College Project Demonstration & Evaluation Showcase Guide

This step-by-step guide is designed for your capstone project presentation and viva evaluation, demonstrating how the **Urban Mobility Platform** fulfills every Course Outcome from **CO1 to CO6**.

---

## 1. Quick Startup (Zero-Friction Demo in 60 Seconds)

### Option A: Immediate Zero-Dependency Demo (FastAPI Engine)
```bash
# Terminal 1: Launch Backend Engine (Port 8000)
python3 backend-fastapi/run_server.py

# Terminal 2: Launch React Frontend Dashboard (Port 5173)
cd frontend
npm run dev
```
Open your browser at: **`http://localhost:5173`**

### Option B: Full Polyglot Docker Cloud-Native Stack
```bash
docker compose up --build
```

---

## 2. 10-Minute Evaluator Presentation Script

### Minute 0 - 2: Architecture & System Overview (CO1, CO5)
1. **Explain the Real-World Problem**: Urban transit networks suffer from traffic congestion delays, unintegrated fleet tracking, and fragmented data storage.
2. **Present the Polyglot Data Inventory**:
   - **PostgreSQL 15 (System of Record)**: Stores transactional entities (`users`, `routes`, `stops`, `trips`, `bookings`). Normalized up to **BCNF** to eliminate update/deletion anomalies.
   - **PostgreSQL pgvector**: High-dimensional vector database indexing transit guides and detour protocols for AI semantic search.
   - **MongoDB 8**: Handles high-velocity IoT GPS sensor breadcrumbs and rider reviews using **2dsphere** spatial indexing.
   - **Redis 7**: Sub-millisecond caching of vehicle coordinates and Socket.io pub/sub.

### Minute 2 - 4: Relational Database & Advanced SQL Engineering (CO1)
1. **Open `database/schema-normalisation.sql`**: Show the mathematical decomposition proof from Unnormalized Form (UNF) through 1NF, 2NF, 3NF, to BCNF with functional dependencies ($FD_1 \dots FD_6$).
2. **Open `database/advanced-queries.sql`**:
   - Show the **Recursive CTE** (`WITH RECURSIVE TransitGraph`) performing multi-hop reachability graph traversal across bus stops.
   - Show the **Window Functions** (`LAG()` & `LEAD()`) calculating transit vehicle headway intervals between consecutive departures.
3. **Open `database/stored-procedures-triggers.sql`**: Show the stored procedure `sp_book_transit_ticket` with pessimistic row locking (`FOR UPDATE`) enforcing strict ACID concurrency.

### Minute 4 - 6: Vector Database, Hybrid Search & RAG Pipeline (CO2, CO3)
1. **In the React Frontend Dashboard**, scroll to the **AI Transit Assistant (Vector RAG)** card.
2. Type the query: `"What is the luggage policy on the Airport Express?"` and click **Ask AI**.
3. **Point out the Results to the Evaluator**:
   - The query was embedded into a normalized **128-dimensional dense vector**.
   - **Cosine similarity** calculated against indexed transit knowledge chunks.
   - The response was synthesized by grounding the knowledge chunk with live database traffic alerts!
   - Highlight the **Confidence Score (73.4%)** and retrieved source citations.

### Minute 6 - 8: Route Intelligence & Distributed Saga Transactions (CO3, CO5)
1. **Dijkstra Route Intelligence**:
   - Select Origin: `Central Station`, Destination: `Airport`.
   - Click **Calculate Optimized Route**.
   - Show that the path was computed via Dijkstra's shortest-path algorithm, and note how active traffic congestion adds dynamic delay penalties.
2. **Distributed Saga Pattern with Compensating Actions**:
   - Click **Book Trip (Saga Success)**: Show the 3-step sequence (Reserve seat in PostgreSQL -> Log activity in MongoDB -> Issue QR confirmation).
   - Click **Simulate Failure (Compensate)**: Show how a simulated failure at Step 2 automatically triggers the **Compensating Transaction**, rolling back the seat reservation in PostgreSQL and restoring vehicle capacity!

### Minute 8 - 10: DevOps, Observability & Kubernetes (CO6)
1. **Show Kubernetes Manifests (`k8s/`)**: Ingress controller routing `/api/v1` to FastAPI Gateway, `/actuator` to Spring Boot, and `/` to React.
2. **Show Prometheus & Grafana Monitoring (`monitoring/`)**: Scrapes request throughput (RPS), p95 latency percentiles, and JVM heap memory.
3. **Show GitHub Actions Pipeline (`.github/workflows/ci.yml`)**: Automated multi-framework CI/CD testing and OWASP Top 10 API Security compliance audit.
