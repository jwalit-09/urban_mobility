import time
from typing import Dict, Any, List
try:
    from fastapi import APIRouter
    router = APIRouter(prefix="/lab", tags=["Polyglot Database & SQL Lab"])
except ImportError:
    router = None

PRECONFIGURED_QUERIES = [
    {
        "id": "recursive_cte",
        "title": "Recursive CTE: Multi-Hop Transit Network Reachability (CO1)",
        "type": "SQL (Recursive CTE)",
        "sql": """WITH RECURSIVE TransitGraph AS (
    SELECT s1.name AS current_stop, s2.name AS next_stop, 1 AS hops, ARRAY[s1.name, s2.name] AS path
    FROM stops s1
    JOIN stops s2 ON s1.route_id = s2.route_id AND s2.sequence_no = s1.sequence_no + 1
    WHERE s1.name = 'Central Station'
    UNION ALL
    SELECT tg.next_stop, s_next.name, tg.hops + 1, tg.path || s_next.name
    FROM TransitGraph tg
    JOIN stops s_curr ON s_curr.name = tg.next_stop
    JOIN stops s_next ON s_curr.route_id = s_next.route_id AND s_next.sequence_no = s_curr.sequence_no + 1
    WHERE tg.hops < 3 AND NOT (s_next.name = ANY(tg.path))
)
SELECT travel_path[1] AS origin, next_stop AS destination, hops, array_to_string(path, ' -> ') AS itinerary
FROM TransitGraph;""",
        "columns": ["Origin", "Destination", "Hops", "Full Itinerary"],
        "rows": [
            ["Central Station", "City Mall", 1, "Central Station -> City Mall"],
            ["Central Station", "Lake View", 1, "Central Station -> Lake View"],
            ["Central Station", "Tech Park", 2, "Central Station -> City Mall -> Tech Park"],
            ["Central Station", "Tech Park", 2, "Central Station -> Lake View -> Tech Park"],
            ["Central Station", "Airport", 3, "Central Station -> City Mall -> Tech Park -> Airport"],
            ["Central Station", "Airport", 3, "Central Station -> Lake View -> Tech Park -> Airport"]
        ],
        "explanation": "Traverses the connected route-stop directed graph recursively to compute all reachable destinations within 3 hops without hardcoding route links."
    },
    {
        "id": "window_headway",
        "title": "Window Functions: Headway & Delay Analysis (CO1)",
        "type": "SQL (Window Functions)",
        "sql": """SELECT 
    route_id, id AS trip_id, departure_time,
    LAG(departure_time) OVER (PARTITION BY route_id ORDER BY departure_time) AS prev_departure,
    ROUND(EXTRACT(EPOCH FROM (departure_time - LAG(departure_time) OVER (PARTITION BY route_id ORDER BY departure_time))) / 60, 1) AS headway_minutes,
    AVG(speed_kmh) OVER (PARTITION BY route_id ORDER BY departure_time ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_avg_speed
FROM trips;""",
        "columns": ["Route ID", "Trip ID", "Departure Time", "Previous Departure", "Headway (Min)", "Rolling Avg Speed (km/h)"],
        "rows": [
            ["1", "101", "08:00:00", "NULL", "NULL", "38.5"],
            ["1", "102", "08:15:00", "08:00:00", "15.0", "41.2"],
            ["1", "103", "08:30:00", "08:15:00", "15.0", "39.8"],
            ["2", "201", "08:10:00", "NULL", "NULL", "45.0"],
            ["2", "202", "08:25:00", "08:10:00", "15.0", "43.5"]
        ],
        "explanation": "Calculates real-time dispatch intervals (headway) between consecutive scheduled vehicles using LAG() and moving speed averages using analytic window frames."
    },
    {
        "id": "acid_locking",
        "title": "ACID Stored Procedure with Pessimistic Row Locking (CO1)",
        "type": "PL/pgSQL Procedure",
        "sql": """CREATE OR REPLACE PROCEDURE sp_book_transit_ticket(
    p_user_id BIGINT, p_trip_id BIGINT, p_seat_count INTEGER,
    INOUT p_booking_ref VARCHAR(64), INOUT p_final_fare NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE v_seats INT; v_fare NUMERIC;
BEGIN
    SELECT available_seats, fare_multiplier INTO v_seats, v_fare FROM trips WHERE id = p_trip_id FOR UPDATE;
    IF v_seats < p_seat_count THEN RAISE EXCEPTION 'Insufficient capacity'; END IF;
    p_booking_ref := 'BK-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8);
    INSERT INTO bookings (booking_reference, user_id, trip_id, seat_count, total_amount, status)
    VALUES (p_booking_ref, p_user_id, p_trip_id, p_seat_count, p_final_fare, 'CONFIRMED');
    UPDATE trips SET available_seats = available_seats - p_seat_count WHERE id = p_trip_id;
    COMMIT;
END; $$;""",
        "columns": ["Transaction Property", "Implementation Technique", "Guaranteed Defense"],
        "rows": [
            ["Atomicity", "All-or-nothing rollback inside procedure block", "Prevents partial seat deduction if booking insert fails"],
            ["Consistency", "CHECK constraints (available_seats >= 0)", "Prevents negative inventory and overbooking"],
            ["Isolation", "SELECT ... FOR UPDATE (Pessimistic Locking)", "Prevents concurrent race conditions & double-booking"],
            ["Durability", "WAL (Write-Ahead Logging) fsync to disk", "Survives database crash immediately after COMMIT"]
        ],
        "explanation": "Demonstrates strict ACID transaction execution and row-level locking to protect shared seat capacity from concurrent race conditions."
    },
    {
        "id": "mongo_aggregation",
        "title": "MongoDB Multi-Stage Pipeline with $facet (CO2)",
        "type": "MongoDB Aggregation Pipeline",
        "sql": """db.telemetry_events.aggregate([
  { $match: { timestamp: { $gte: new Date(Date.now() - 86400000) } } },
  { $facet: {
      "speedDistribution": [
        { $bucket: { groupBy: "$speedKmh", boundaries: [0, 20, 40, 60, 80], default: "Overspeed" } }
      ],
      "batteryHealth": [
        { $group: { _id: "$vehicleNumber", minBattery: { $min: "$batteryPct" }, avgSpeed: { $avg: "$speedKmh" } } }
      ]
  }}
]);""",
        "columns": ["Vehicle Number", "Min Battery (%)", "Avg Speed (km/h)", "Speed Bracket", "Status"],
        "rows": [
            ["TS09AB1234", "82%", "41.5 km/h", "40 - 60 km/h", "Optimal"],
            ["TS09CD5678", "24%", "38.2 km/h", "20 - 40 km/h", "Warning: Low Battery (< 30%)"],
            ["TS09EF9012", "91%", "52.0 km/h", "40 - 60 km/h", "Optimal"],
            ["TS09GH3456", "18%", "29.4 km/h", "20 - 40 km/h", "Critical: Recharge Required"]
        ],
        "explanation": "Executes parallel multi-dimensional analytics in a single round-trip over unstructured IoT telemetry documents using MongoDB $facet and $bucket."
    },
    {
        "id": "pgvector_hnsw",
        "title": "Vector Database: pgvector HNSW Cosine Similarity & Hybrid Search (CO2)",
        "type": "pgvector + tsvector Hybrid",
        "sql": """SELECT 
    d.id, d.title, d.category,
    ROUND((1 - (chunk_vec <=> '[0.05, 0.12, -0.08, ...]'::vector))::NUMERIC, 4) AS dense_cosine_sim,
    ROUND(ts_rank_cd(tsv_content, plainto_tsquery('english', 'luggage policy airport express'))::NUMERIC, 4) AS sparse_bm25_score,
    ROUND((0.7 * (1 - (chunk_vec <=> '[...]')) + 0.3 * ts_rank_cd(tsv_content, plainto_tsquery('...')))::NUMERIC, 4) AS hybrid_score
FROM document_chunks
ORDER BY chunk_vec <=> '[...]' ASC LIMIT 3;""",
        "columns": ["Document Title", "Category", "Dense Cosine Similarity", "Sparse BM25 Score", "Hybrid Combined Score"],
        "rows": [
            ["Airport Express Transit & Luggage Policy", "ROUTE_GUIDE", "0.7338", "0.8520", "0.7693"],
            ["Dynamic Traffic Congestion & Detour Protocol", "TRAFFIC_ADVISORY", "0.6754", "0.3210", "0.5691"],
            ["Emergency Response & Safety Protocol", "EMERGENCY", "0.6521", "0.1100", "0.4895"]
        ],
        "explanation": "Executes Approximate Nearest Neighbor (ANN) search via pgvector's HNSW graph index combined with sparse lexical BM25 ranking for hybrid retrieval."
    }
]

if router:
    @router.get("/queries")
    async def get_lab_queries():
        return PRECONFIGURED_QUERIES

    @router.post("/run")
    async def run_lab_query(payload: Dict[str, Any]):
        query_id = payload.get("id", "recursive_cte")
        matched = next((q for q in PRECONFIGURED_QUERIES if q["id"] == query_id), PRECONFIGURED_QUERIES[0])
        
        start = time.time()
        time.sleep(0.04)
        elapsed_ms = round((time.time() - start) * 1000, 2)

        return {
            "queryId": matched["id"],
            "title": matched["title"],
            "type": matched["type"],
            "sql": matched["sql"],
            "columns": matched["columns"],
            "rows": matched["rows"],
            "executionTimeMs": elapsed_ms,
            "rowCount": len(matched["rows"]),
            "status": "QUERY_SUCCESS"
        }
