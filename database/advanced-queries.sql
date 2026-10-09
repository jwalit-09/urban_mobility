-- ============================================================================
-- URBAN MOBILITY PLATFORM - ADVANCED SQL QUERY ENGINEERING (CO1)
-- Topics: DML, Multi-Table Joins, Correlated Subqueries, CTEs, Window Functions
-- Dialect: ANSI SQL / PostgreSQL 15+ / MySQL 8+
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADVANCED JOINS (INNER, LEFT, RIGHT, FULL OUTER, CROSS, SELF JOIN)
-- ----------------------------------------------------------------------------

-- A. INNER JOIN with Multi-Table Relationships
-- Get all active trips with vehicle, assigned driver, and route details
SELECT 
    t.id AS trip_id,
    r.name AS route_name,
    v.vehicle_number,
    d.name AS driver_name,
    t.departure_time,
    t.available_seats,
    t.status
FROM trips t
INNER JOIN routes r ON t.route_id = r.id
INNER JOIN vehicles v ON t.vehicle_id = v.id
INNER JOIN drivers d ON t.driver_id = d.id
WHERE t.status IN ('SCHEDULED', 'IN_TRANSIT');

-- B. LEFT OUTER JOIN
-- Retrieve all routes and their currently reported traffic severity (including routes with no traffic incidents)
SELECT 
    r.id AS route_id,
    r.name AS route_name,
    r.distance_km,
    COALESCE(tu.severity, 'NONE') AS current_severity,
    COALESCE(tu.delay_minutes, 0) AS delay_minutes,
    COALESCE(tu.message, 'No active incidents reported') AS traffic_status
FROM routes r
LEFT JOIN traffic_updates tu ON r.id = tu.route_id AND tu.is_active = TRUE;

-- C. FULL OUTER JOIN
-- Reconcile driver workforce against vehicle assignments (find unassigned vehicles and unassigned drivers)
SELECT 
    v.vehicle_number,
    v.type AS vehicle_type,
    d.name AS driver_name,
    d.license_number,
    CASE 
        WHEN v.id IS NOT NULL AND d.id IS NOT NULL THEN 'Assigned'
        WHEN v.id IS NOT NULL AND d.id IS NULL THEN 'Vehicle Idle (No Driver)'
        ELSE 'Driver Unassigned (No Vehicle)'
    END AS assignment_status
FROM vehicles v
FULL OUTER JOIN drivers d ON v.driver_id = d.id;

-- D. SELF JOIN
-- Pair adjacent consecutive stops on the same route to compute stop-to-stop links
SELECT 
    s1.route_id,
    r.name AS route_name,
    s1.sequence_no AS origin_seq,
    s1.name AS origin_stop,
    s2.sequence_no AS dest_seq,
    s2.name AS dest_stop
FROM stops s1
INNER JOIN stops s2 ON s1.route_id = s2.route_id AND s2.sequence_no = s1.sequence_no + 1
INNER JOIN routes r ON s1.route_id = r.id
ORDER BY s1.route_id, s1.sequence_no;

-- ----------------------------------------------------------------------------
-- 2. CORRELATED & UNCORRELATED SUBQUERIES
-- ----------------------------------------------------------------------------

-- A. Uncorrelated Subquery with IN / NOT IN
-- Find vehicles that have never experienced an anomaly alert in their telemetry history
SELECT id, vehicle_number, type, capacity
FROM vehicles
WHERE vehicle_number NOT IN (
    SELECT DISTINCT vehicle_number 
    FROM telemetry_logs 
    WHERE anomaly_alert = TRUE
);

-- B. Correlated Subquery with EXISTS
-- Find all routes that currently have at least one trip departing in the next 2 hours
SELECT r.id, r.name, r.source, r.destination
FROM routes r
WHERE EXISTS (
    SELECT 1 
    FROM trips t 
    WHERE t.route_id = r.id 
      AND t.departure_time BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '2 HOURS'
);

-- C. Correlated Subquery in SELECT clause
-- List each driver along with the total count of completed trips they have personally conducted
SELECT 
    d.id,
    d.name,
    d.license_number,
    (
        SELECT COUNT(*) 
        FROM trips t 
        WHERE t.driver_id = d.id AND t.status = 'COMPLETED'
    ) AS completed_trip_count
FROM drivers d;

-- ----------------------------------------------------------------------------
-- 3. COMMON TABLE EXPRESSIONS (CTEs)
-- ----------------------------------------------------------------------------

-- A. Non-Recursive Multi-Stage Analytics CTE
-- Calculate route revenue, total passenger volume, and capacity utilization
WITH RouteBookingStats AS (
    SELECT 
        t.route_id,
        COUNT(b.id) AS total_reservations,
        SUM(b.seat_count) AS total_passengers,
        SUM(b.total_amount) AS total_revenue
    FROM trips t
    LEFT JOIN bookings b ON t.id = b.trip_id AND b.status = 'CONFIRMED'
    GROUP BY t.route_id
),
RouteCapacityStats AS (
    SELECT 
        t.route_id,
        SUM(v.capacity) AS total_offered_capacity
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    GROUP BY t.route_id
)
SELECT 
    r.name AS route_name,
    r.transit_mode,
    COALESCE(rbs.total_passengers, 0) AS total_passengers,
    COALESCE(rbs.total_revenue, 0.00) AS total_revenue,
    ROUND(
        (COALESCE(rbs.total_passengers, 0)::NUMERIC / NULLIF(rcs.total_offered_capacity, 0)) * 100, 2
    ) AS capacity_utilization_pct
FROM routes r
LEFT JOIN RouteBookingStats rbs ON r.id = rbs.route_id
LEFT JOIN RouteCapacityStats rcs ON r.id = rcs.route_id
ORDER BY total_revenue DESC;

-- B. RECURSIVE CTE: Multi-Hop Transit Network Traversal (Graph Reachability)
-- Traverses connected route-stop graphs to find all reachable destinations within 3 hops
WITH RECURSIVE TransitGraph AS (
    -- Anchor Member: Direct starting stops from 'Central Station'
    SELECT 
        s1.name AS current_stop,
        s2.name AS next_stop,
        1 AS hop_count,
        ARRAY[s1.name, s2.name] AS travel_path
    FROM stops s1
    JOIN stops s2 ON s1.route_id = s2.route_id AND s2.sequence_no = s1.sequence_no + 1
    WHERE s1.name = 'Central Station'

    UNION ALL

    -- Recursive Member: Join destination of previous hop to origin of next hop
    SELECT 
        tg.next_stop AS current_stop,
        s_next.name AS next_stop,
        tg.hop_count + 1 AS hop_count,
        tg.travel_path || s_next.name AS travel_path
    FROM TransitGraph tg
    JOIN stops s_curr ON s_curr.name = tg.next_stop
    JOIN stops s_next ON s_curr.route_id = s_next.route_id AND s_next.sequence_no = s_curr.sequence_no + 1
    WHERE tg.hop_count < 3 -- Terminate recursion after 3 hops
      AND NOT (s_next.name = ANY(tg.travel_path)) -- Prevent cyclic loops
)
SELECT DISTINCT 
    travel_path[1] AS start_station,
    next_stop AS destination_station,
    hop_count,
    array_to_string(travel_path, ' -> ') AS full_itinerary
FROM TransitGraph
ORDER BY hop_count, next_stop;

-- ----------------------------------------------------------------------------
-- 4. WINDOW FUNCTIONS (Analytical & Ranking Calculations)
-- ----------------------------------------------------------------------------

-- A. ROW_NUMBER, RANK, and DENSE_RANK
-- Rank routes by total distance within each transit mode
SELECT 
    transit_mode,
    name AS route_name,
    distance_km,
    ROW_NUMBER() OVER (PARTITION BY transit_mode ORDER BY distance_km DESC) AS row_num,
    RANK() OVER (PARTITION BY transit_mode ORDER BY distance_km DESC) AS distance_rank,
    DENSE_RANK() OVER (PARTITION BY transit_mode ORDER BY distance_km DESC) AS dense_dist_rank
FROM routes;

-- B. LAG and LEAD: Calculate Headway Between Consecutive Scheduled Trips
SELECT 
    route_id,
    id AS trip_id,
    departure_time,
    LAG(departure_time) OVER (
        PARTITION BY route_id ORDER BY departure_time
    ) AS previous_trip_departure,
    EXTRACT(
        EPOCH FROM (departure_time - LAG(departure_time) OVER (PARTITION BY route_id ORDER BY departure_time))
    ) / 60 AS headway_minutes,
    LEAD(departure_time) OVER (
        PARTITION BY route_id ORDER BY departure_time
    ) AS next_trip_departure
FROM trips
ORDER BY route_id, departure_time;

-- C. Moving Averages & Rolling Statistics
-- Calculate 3-period moving average of vehicle speed from telemetry logs
SELECT 
    vehicle_number,
    recorded_at,
    speed_kmh,
    AVG(speed_kmh) OVER (
        PARTITION BY vehicle_number 
        ORDER BY recorded_at 
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS rolling_avg_speed_3_ticks,
    MAX(speed_kmh) OVER (
        PARTITION BY vehicle_number 
        ORDER BY recorded_at 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_max_speed
FROM telemetry_logs
ORDER BY vehicle_number, recorded_at;

-- ----------------------------------------------------------------------------
-- 5. ADVANCED AGGREGATES: ROLLUP, CUBE, GROUPING SETS
-- ----------------------------------------------------------------------------

-- Multi-dimensional aggregation of bookings by transit mode and booking status
SELECT 
    COALESCE(r.transit_mode, 'ALL MODES') AS transit_mode,
    COALESCE(b.status, 'ALL STATUSES') AS booking_status,
    COUNT(b.id) AS total_bookings,
    SUM(b.total_amount) AS aggregate_revenue
FROM bookings b
JOIN trips t ON b.trip_id = t.id
JOIN routes r ON t.route_id = r.id
GROUP BY ROLLUP (r.transit_mode, b.status)
ORDER BY r.transit_mode, b.status;
