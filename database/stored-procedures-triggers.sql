-- ============================================================================
-- URBAN MOBILITY PLATFORM - TRANSACTIONS & STORED LOGIC (CO1)
-- Topics: ACID, Isolation Levels, MVCC, Procedures, Triggers, Views & MVs
-- Dialect: PostgreSQL 15+ PL/pgSQL (with ANSI SQL standard logic)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. STORED PROCEDURES (ACID Transactional Logic)
-- ----------------------------------------------------------------------------

-- Procedure A: Atomically Book a Transit Ticket with Pessimistic Row Locking
CREATE OR REPLACE PROCEDURE sp_book_transit_ticket(
    p_user_id BIGINT,
    p_trip_id BIGINT,
    p_seat_count INTEGER,
    INOUT p_booking_ref VARCHAR(64) DEFAULT NULL,
    INOUT p_final_fare NUMERIC(10, 2) DEFAULT 0.00
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_available_seats INTEGER;
    v_base_fare NUMERIC(10, 2);
    v_multiplier NUMERIC(3, 2);
BEGIN
    -- STEP 1: Pessimistic Row Lock (FOR UPDATE) to prevent race conditions & double-booking
    SELECT available_seats, fare_multiplier 
    INTO v_available_seats, v_multiplier
    FROM trips
    WHERE id = p_trip_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip ID % does not exist.', p_trip_id;
    END IF;

    -- STEP 2: Business Constraint Validation
    IF v_available_seats < p_seat_count THEN
        RAISE EXCEPTION 'Insufficient capacity. Requested % seats, but only % remain.', 
            p_seat_count, v_available_seats;
    END IF;

    -- Fetch Route Base Fare
    SELECT r.base_fare INTO v_base_fare
    FROM routes r
    JOIN trips t ON t.route_id = r.id
    WHERE t.id = p_trip_id;

    -- STEP 3: Compute Total Amount
    p_final_fare := ROUND((v_base_fare * v_multiplier * p_seat_count), 2);
    p_booking_ref := 'BK-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8);

    -- STEP 4: Insert Booking Record
    INSERT INTO bookings (
        booking_reference, user_id, trip_id, seat_count, total_amount, status, saga_state
    ) VALUES (
        p_booking_ref, p_user_id, p_trip_id, p_seat_count, p_final_fare, 'CONFIRMED', 'COMPLETED'
    );

    -- STEP 5: Decrement Available Seats Atomically
    UPDATE trips
    SET available_seats = available_seats - p_seat_count
    WHERE id = p_trip_id;

    -- STEP 6: Write to Audit Trail
    INSERT INTO audit_logs (action, entity_name, entity_id, details, performed_by)
    VALUES (
        'CREATE_BOOKING', 
        'trips', 
        p_trip_id, 
        FORMAT('Booked %s seats for user %s. Ref: %s. Amount: %s', p_seat_count, p_user_id, p_booking_ref, p_final_fare),
        'sp_book_transit_ticket'
    );

    COMMIT; -- Explicit transaction boundary
END;
$$;


-- Procedure B: Recalculate Route ETA incorporating Active Traffic Delays
CREATE OR REPLACE PROCEDURE sp_recalculate_route_eta(
    p_route_id BIGINT,
    INOUT p_new_estimated_minutes INTEGER DEFAULT 0
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_base_minutes INTEGER;
    v_delay_minutes INTEGER := 0;
    v_stop_count INTEGER;
BEGIN
    SELECT base_minutes INTO v_base_minutes FROM routes WHERE id = p_route_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Route ID % not found.', p_route_id;
    END IF;

    -- Sum active traffic delay
    SELECT COALESCE(SUM(delay_minutes), 0)
    INTO v_delay_minutes
    FROM traffic_updates
    WHERE route_id = p_route_id AND is_active = TRUE;

    -- Count stops to add dwell delay (approx 1 min per intermediate stop)
    SELECT COUNT(*) INTO v_stop_count FROM stops WHERE route_id = p_route_id;

    p_new_estimated_minutes := v_base_minutes + v_delay_minutes + GREATEST(0, (v_stop_count - 1));

    -- Audit ETA recalculation
    INSERT INTO audit_logs (action, entity_name, entity_id, details, performed_by)
    VALUES (
        'ETA_RECALCULATION', 
        'routes', 
        p_route_id, 
        FORMAT('Route ETA updated to %s minutes (Base: %s, Delay: %s, Stops: %s)', 
               p_new_estimated_minutes, v_base_minutes, v_delay_minutes, v_stop_count),
        'sp_recalculate_route_eta'
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. TRIGGERS & TRIGGER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Trigger 1: Automatic Audit Logging on Traffic Updates
CREATE OR REPLACE FUNCTION fn_audit_traffic_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs(action, entity_name, entity_id, details, performed_by)
        VALUES ('TRAFFIC_REPORTED', 'traffic_updates', NEW.id,
                FORMAT('New [%s] incident on route %s: %s (Delay: +%s min)', NEW.severity, NEW.route_id, NEW.message, NEW.delay_minutes),
                COALESCE(NEW.reported_by, 'TRIGGER_SYSTEM'));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs(action, entity_name, entity_id, details, performed_by)
        VALUES ('TRAFFIC_RESOLVED_OR_MODIFIED', 'traffic_updates', NEW.id,
                FORMAT('Modified traffic on route %s. Active: %s -> %s', NEW.route_id, OLD.is_active, NEW.is_active),
                'TRIGGER_SYSTEM');
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_traffic ON traffic_updates;
CREATE TRIGGER trg_audit_traffic
AFTER INSERT OR UPDATE ON traffic_updates
FOR EACH ROW
EXECUTE FUNCTION fn_audit_traffic_update();


-- Trigger 2: Sync Vehicle Coordinates & Anomaly Detection on Telemetry Ping
CREATE OR REPLACE FUNCTION fn_sync_vehicle_telemetry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Synchronize Vehicle's real-time position and battery
    UPDATE vehicles
    SET current_latitude = NEW.latitude,
        current_longitude = NEW.longitude,
        battery_or_fuel_pct = COALESCE(NEW.battery_or_fuel_pct, battery_or_fuel_pct),
        updated_at = CURRENT_TIMESTAMP
    WHERE vehicle_number = NEW.vehicle_number;

    -- Anomaly flag check: low battery (< 15%) or severe overspeeding (> 80 km/h in city)
    IF NEW.battery_or_fuel_pct < 15 OR NEW.speed_kmh > 80.0 THEN
        NEW.anomaly_alert := TRUE;
        NEW.anomaly_description := CASE 
            WHEN NEW.battery_or_fuel_pct < 15 AND NEW.speed_kmh > 80.0 THEN 'CRITICAL: Critical Low Battery (<15%) & Overspeeding (>80 km/h)'
            WHEN NEW.battery_or_fuel_pct < 15 THEN 'WARNING: Low Battery level below 15%'
            ELSE 'WARNING: Vehicle speed exceeded urban speed limit (80 km/h)'
        END;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vehicle ON telemetry_logs;
CREATE TRIGGER trg_sync_vehicle
BEFORE INSERT ON telemetry_logs
FOR EACH ROW
EXECUTE FUNCTION fn_sync_vehicle_telemetry();

-- ----------------------------------------------------------------------------
-- 3. VIEWS & MATERIALIZED VIEWS
-- ----------------------------------------------------------------------------

-- Standard View: Active Route Schedules and Dispatches
CREATE OR REPLACE VIEW v_active_route_schedules AS
SELECT 
    r.id AS route_id,
    r.name AS route_name,
    r.source,
    r.destination,
    r.transit_mode,
    t.id AS trip_id,
    t.departure_time,
    t.available_seats,
    v.vehicle_number,
    d.name AS driver_name,
    COALESCE(tu.severity, 'CLEAR') AS traffic_status,
    COALESCE(tu.delay_minutes, 0) AS traffic_delay_min
FROM routes r
JOIN trips t ON r.id = t.route_id
LEFT JOIN vehicles v ON t.vehicle_id = v.id
LEFT JOIN drivers d ON t.driver_id = d.id
LEFT JOIN traffic_updates tu ON r.id = tu.route_id AND tu.is_active = TRUE
WHERE t.status IN ('SCHEDULED', 'IN_TRANSIT');


-- Materialized View: Daily Transit Performance KPIs
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_transit_kpis AS
SELECT 
    DATE_TRUNC('day', t.departure_time) AS service_date,
    r.transit_mode,
    COUNT(DISTINCT t.id) AS total_scheduled_trips,
    COUNT(b.id) AS total_ticket_sales,
    COALESCE(SUM(b.total_amount), 0.00) AS daily_revenue,
    COALESCE(ROUND(AVG(tu.delay_minutes), 1), 0.0) AS avg_traffic_delay_min
FROM trips t
JOIN routes r ON t.route_id = r.id
LEFT JOIN bookings b ON t.id = b.trip_id AND b.status = 'CONFIRMED'
LEFT JOIN traffic_updates tu ON r.id = tu.route_id
GROUP BY DATE_TRUNC('day', t.departure_time), r.transit_mode;

-- Refresh command for Materialized View:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_transit_kpis;

-- ----------------------------------------------------------------------------
-- 4. ACID TRANSACTIONS & CONCURRENCY ISOLATION LAB
-- ----------------------------------------------------------------------------

/*
DEMONSTRATING TRANSACTION ISOLATION LEVELS:

Level 1: READ UNCOMMITTED (Allowed in MySQL, treated as Read Committed in PostgreSQL)
  Allows Dirty Reads: Transaction A reads data modified by uncommitted Transaction B.

Level 2: READ COMMITTED (Default in PostgreSQL)
  Prevents Dirty Reads: Reads only committed rows.
  Allows Non-Repeatable Reads: Transaction A reads row X. Transaction B updates row X & commits.
  Transaction A re-reads row X and sees the changed value.

Level 3: REPEATABLE READ
  Prevents Dirty Reads and Non-Repeatable Reads.
  Transaction takes a snapshot at the start of the first query.
  In standard ANSI SQL, may allow Phantom Reads (new rows inserted by another txn).
  In PostgreSQL MVCC, Repeatable Read also prevents Phantom Reads!

Level 4: SERIALIZABLE
  Highest isolation level. Executes transactions as if they were run serially.
  Uses Serializable Snapshot Isolation (SSI) to detect write skew and read-write conflicts.
  If conflict occurs, aborts with 'could not serialize access due to read/write dependencies'.
*/

-- Concurrency Test Demonstration Script:
-- Session 1 (Trip Reservation in Repeatable Read):
-- BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- SELECT available_seats FROM trips WHERE id = 1;
-- UPDATE trips SET available_seats = available_seats - 2 WHERE id = 1;
-- COMMIT;

-- Multi-Version Concurrency Control (MVCC) Catalog Inspection Query:
-- Shows PostgreSQL transaction visibility metadata (xmin, xmax)
SELECT 
    id, 
    email, 
    role, 
    xmin AS row_creation_txid, 
    xmax AS row_deletion_or_lock_txid
FROM users 
LIMIT 5;
