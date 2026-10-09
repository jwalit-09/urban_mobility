-- ============================================================================
-- URBAN MOBILITY PLATFORM - RELATIONAL DATABASE SCHEMA (CO1 & CO2)
-- Relational Database Engineering: DDL, Constraints, Normalisation & Indexing
-- Dialect: PostgreSQL 15+ (Compatible with standard ANSI SQL & MySQL 8+)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & DOMAINS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector extension for AI embeddings

-- Custom Enumerated Domains / Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'OPERATOR', 'DRIVER', 'PASSENGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE traffic_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trip_status AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'DELAYED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transit_mode AS ENUM ('BUS', 'ELECTRIC_BUS', 'METRO', 'TRAM', 'EXPRESS_SHUTTLE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CORE RELATIONAL TABLES (3NF & BCNF Normalized)
-- ----------------------------------------------------------------------------

-- Table: users (Identity & Authentication)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'PASSENGER',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Table: drivers (Fleet Workforce)
CREATE TABLE IF NOT EXISTS drivers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
    total_trips INTEGER DEFAULT 0 CHECK (total_trips >= 0),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: vehicles (Fleet Assets)
CREATE TABLE IF NOT EXISTS vehicles (
    id BIGSERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'Bus',
    transit_mode VARCHAR(50) NOT NULL DEFAULT 'BUS',
    capacity INTEGER NOT NULL CHECK (capacity > 0 AND capacity <= 500),
    battery_or_fuel_pct INTEGER DEFAULT 100 CHECK (battery_or_fuel_pct >= 0 AND battery_or_fuel_pct <= 100),
    current_latitude NUMERIC(10, 7) CHECK (current_latitude BETWEEN -90.0 AND 90.0),
    current_longitude NUMERIC(10, 7) CHECK (current_longitude BETWEEN -180.0 AND 180.0),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    driver_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: routes (Transit Lines)
CREATE TABLE IF NOT EXISTS routes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    source VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    distance_km NUMERIC(6, 2) NOT NULL CHECK (distance_km > 0),
    base_minutes INTEGER NOT NULL CHECK (base_minutes > 0),
    base_fare NUMERIC(8, 2) NOT NULL DEFAULT 20.00 CHECK (base_fare >= 0),
    co2_grams_per_km NUMERIC(6, 2) NOT NULL DEFAULT 65.00 CHECK (co2_grams_per_km >= 0),
    transit_mode VARCHAR(50) NOT NULL DEFAULT 'BUS',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_route_src_dst_different CHECK (source <> destination)
);

-- Table: stops (Waypoints along routes - 1:N with Route)
CREATE TABLE IF NOT EXISTS stops (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
    latitude NUMERIC(10, 7) CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude NUMERIC(10, 7) CHECK (longitude BETWEEN -180.0 AND 180.0),
    dwell_time_seconds INTEGER DEFAULT 60 CHECK (dwell_time_seconds >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_stop_sequence UNIQUE (route_id, sequence_no)
);

-- Table: trips (Scheduled & Active Dispatches)
CREATE TABLE IF NOT EXISTS trips (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
    vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    arrival_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
    fare_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (fare_multiplier >= 0.5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_trip_arrival_after_departure CHECK (arrival_time IS NULL OR arrival_time >= departure_time)
);

-- Table: bookings (Passenger Reservations - Distributed Saga Subject)
CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    booking_reference VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
    seat_count INTEGER NOT NULL DEFAULT 1 CHECK (seat_count > 0 AND seat_count <= 10),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED', -- PENDING, CONFIRMED, CANCELLED, REFUNDED
    saga_state VARCHAR(50) DEFAULT 'COMPLETED',       -- SAGA_INIT, SEAT_RESERVED, PAID, SAGA_COMPENSATED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: traffic_updates (Dynamic Route Conditions)
CREATE TABLE IF NOT EXISTS traffic_updates (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    severity VARCHAR(50) NOT NULL DEFAULT 'LOW',
    delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
    message TEXT NOT NULL,
    reported_by VARCHAR(100) DEFAULT 'SYSTEM',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: telemetry_logs (Vehicle GPS & Sensor Time-Series)
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) NOT NULL,
    route_id BIGINT REFERENCES routes(id) ON DELETE SET NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    speed_kmh NUMERIC(6, 2) CHECK (speed_kmh >= 0),
    battery_or_fuel_pct INTEGER CHECK (battery_or_fuel_pct BETWEEN 0 AND 100),
    passenger_count INTEGER CHECK (passenger_count >= 0),
    anomaly_alert BOOLEAN DEFAULT FALSE,
    anomaly_description VARCHAR(255),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: transit_documents (Unstructured Knowledge Base for RAG)
CREATE TABLE IF NOT EXISTS transit_documents (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- ROUTE_GUIDE, TRAFFIC_ADVISORY, FLEET_INFO, EMERGENCY, TRANSIT_POLICY
    content TEXT NOT NULL,
    tags VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: document_chunks (Vector Store with pgvector Embeddings)
CREATE TABLE IF NOT EXISTS document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES transit_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(128),              -- Dense vector representation (128 dimensions)
    token_count INTEGER,
    tsv_content tsvector,               -- Sparse lexical representation for Hybrid Search (BM25)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: audit_logs (Regulatory Compliance & Security Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id BIGINT,
    details TEXT,
    performed_by VARCHAR(150),
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. INDEX DESIGN & PERFORMANCE OPTIMISATION
-- ----------------------------------------------------------------------------

-- B-Tree Indexes for Frequent Equality & Range Lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name);
CREATE INDEX IF NOT EXISTS idx_stops_route_seq ON stops(route_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_trips_route_dept ON trips(route_id, departure_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_route_active ON traffic_updates(route_id) WHERE is_active = TRUE;

-- Composite Index for Time-Series Vehicle Telemetry Lookups
CREATE INDEX IF NOT EXISTS idx_telemetry_veh_time ON telemetry_logs(vehicle_number, recorded_at DESC);

-- GIN (Generalized Inverted Index) for Full-Text Hybrid Search
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON document_chunks USING gin(tsv_content);

-- HNSW (Hierarchical Navigable Small World) Index for Fast Approximate Nearest Neighbor (ANN) Vector Search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
