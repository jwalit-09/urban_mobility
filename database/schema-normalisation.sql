-- ============================================================================
-- URBAN MOBILITY PLATFORM - SCHEMA DESIGN & NORMALISATION STUDY (CO1)
-- Walkthrough: UNF -> 1NF -> 2NF -> 3NF -> BCNF Decomposition Proofs
-- ============================================================================

/*
--------------------------------------------------------------------------------
1. UN-NORMALISED FORM (UNF) - THE NAIVE LEGACY TRANSIT SHEET
--------------------------------------------------------------------------------
Consider a naive spreadsheet representation storing trip dispatch data:

UNF_Trip_Sheet:
  (trip_id, departure_time, vehicle_num, vehicle_type, vehicle_capacity,
   driver_license, driver_name, driver_phone,
   route_name, route_source, route_destination, route_distance,
   stops_list [ARRAY/CSV], stop_sequences [ARRAY/CSV],
   passenger_emails [ARRAY/CSV], passenger_seats [ARRAY/CSV])

Problems with UNF:
- Repeating Groups (arrays of stops and passengers inside a single row).
- Massive Update Anomalies (changing driver phone requires editing 500 rows).
- Insertion Anomalies (cannot record a driver without scheduling a trip).
- Deletion Anomalies (deleting the only trip on a route loses route stop data).

--------------------------------------------------------------------------------
2. FIRST NORMAL FORM (1NF)
--------------------------------------------------------------------------------
Definition:
A relation is in 1NF if and only if:
1. Every attribute domain contains only atomic (indivisible) values.
2. There are no repeating groups or nested arrays.
3. A unique Primary Key is defined.

Step 1 Decomposition: Flatten repeating groups into discrete tuples.
Composite Candidate Key: (trip_id, stop_sequence, passenger_email)
*/

-- 1NF Demonstration Table (Atomic columns, but suffering from Partial Dependencies)
CREATE TABLE IF NOT EXISTS demo_1nf_transit_flat (
    trip_id BIGINT NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    vehicle_num VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_capacity INT NOT NULL,
    driver_license VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    route_id BIGINT NOT NULL,
    route_name VARCHAR(100) NOT NULL,
    stop_sequence INT NOT NULL,
    stop_name VARCHAR(100) NOT NULL,
    passenger_email VARCHAR(100) NOT NULL,
    seat_number INT NOT NULL,
    PRIMARY KEY (trip_id, stop_sequence, passenger_email)
);

/*
Functional Dependencies (FDs) in 1NF table:
  FD1: trip_id -> departure_time, vehicle_num, driver_license, route_id
  FD2: vehicle_num -> vehicle_type, vehicle_capacity
  FD3: driver_license -> driver_name
  FD4: (route_id, stop_sequence) -> stop_name
  FD5: route_id -> route_name
  FD6: (trip_id, seat_number) -> passenger_email

Violation of 2NF:
The primary key is composite: (trip_id, stop_sequence, passenger_email).
Notice: departure_time depends ONLY on trip_id (a proper subset of the PK).
stop_name depends on (route_id, stop_sequence), not on passenger_email or trip_id.
This is a PARTIAL FUNCTIONAL DEPENDENCY.

--------------------------------------------------------------------------------
3. SECOND NORMAL FORM (2NF)
--------------------------------------------------------------------------------
Definition:
A relation is in 2NF if:
1. It is in 1NF.
2. Every non-prime attribute is FULLY FUNCTIONALLY DEPENDENT on the whole candidate key.
   (No partial dependencies on a subset of any candidate key).

Decomposition:
Separate attributes depending on proper subsets of candidate keys into their own relations.
*/

-- Relation 1: Trips (trip_id is key)
CREATE TABLE IF NOT EXISTS demo_2nf_trips (
    trip_id BIGINT PRIMARY KEY,
    departure_time TIMESTAMP NOT NULL,
    vehicle_num VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,     -- Still transitive: vehicle_num -> vehicle_type
    vehicle_capacity INT NOT NULL,         -- Still transitive
    driver_license VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,     -- Still transitive: driver_license -> driver_name
    route_id BIGINT NOT NULL,
    route_name VARCHAR(100) NOT NULL       -- Still transitive: route_id -> route_name
);

-- Relation 2: Route Stops ((route_id, stop_sequence) is key)
CREATE TABLE IF NOT EXISTS demo_2nf_route_stops (
    route_id BIGINT NOT NULL,
    stop_sequence INT NOT NULL,
    stop_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (route_id, stop_sequence)
);

-- Relation 3: Trip Bookings ((trip_id, seat_number) is key)
CREATE TABLE IF NOT EXISTS demo_2nf_bookings (
    trip_id BIGINT NOT NULL,
    seat_number INT NOT NULL,
    passenger_email VARCHAR(100) NOT NULL,
    PRIMARY KEY (trip_id, seat_number)
);

/*
Violation of 3NF in demo_2nf_trips:
Notice in demo_2nf_trips:
  PK: trip_id
  trip_id -> driver_license
  driver_license -> driver_name
Therefore: trip_id -> driver_name is a TRANSITIVE DEPENDENCY via driver_license.
Similarly: trip_id -> vehicle_num -> vehicle_capacity is transitive.

--------------------------------------------------------------------------------
4. THIRD NORMAL FORM (3NF)
--------------------------------------------------------------------------------
Definition:
A relation is in 3NF if:
1. It is in 2NF.
2. For every non-trivial functional dependency X -> A, either:
   a) X is a superkey, OR
   b) A is a prime attribute (part of a candidate key).
(No non-prime attribute is transitively dependent on any candidate key).

Decomposition into 3NF:
Extract transitive dependencies into independent tables:
  - vehicles (vehicle_num PK -> vehicle_type, vehicle_capacity)
  - drivers (driver_license PK -> driver_name)
  - routes (route_id PK -> route_name)
*/

-- 3NF Table: Vehicles
CREATE TABLE IF NOT EXISTS demo_3nf_vehicles (
    vehicle_num VARCHAR(50) PRIMARY KEY,
    vehicle_type VARCHAR(50) NOT NULL,
    capacity INT NOT NULL
);

-- 3NF Table: Drivers
CREATE TABLE IF NOT EXISTS demo_3nf_drivers (
    driver_license VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20)
);

-- 3NF Table: Routes
CREATE TABLE IF NOT EXISTS demo_3nf_routes (
    route_id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL
);

-- 3NF Table: Cleaned Trips (Now free of transitive dependencies)
CREATE TABLE IF NOT EXISTS demo_3nf_trips (
    trip_id BIGINT PRIMARY KEY,
    departure_time TIMESTAMP NOT NULL,
    vehicle_num VARCHAR(50) REFERENCES demo_3nf_vehicles(vehicle_num),
    driver_license VARCHAR(50) REFERENCES demo_3nf_drivers(driver_license),
    route_id BIGINT REFERENCES demo_3nf_routes(route_id)
);

/*
--------------------------------------------------------------------------------
5. BOYCE-CODD NORMAL FORM (BCNF)
--------------------------------------------------------------------------------
Definition:
A relation is in BCNF (a stricter version of 3NF) if:
For EVERY functional dependency X -> Y, X MUST BE A SUPERKEY.
(Eliminates edge cases in 3NF where X is not a superkey but Y is a prime attribute).

Case Study in Urban Mobility:
Consider Driver Shift Allocation:
Attributes: (driver_id, route_id, shift_slot)
Candidate Keys:
  CK1: (driver_id, shift_slot)  -- A driver works at most 1 route per slot
  CK2: (route_id, shift_slot)   -- Each route slot has 1 assigned driver
Suppose business rule dictates:
  driver_id -> depot_region (Each driver is strictly tied to one regional depot)
Then in relation (driver_id, route_id, depot_region):
  (driver_id, route_id) -> depot_region (Valid)
  depot_region is NOT a superkey, but if it determined another prime attribute,
  3NF would allow it if that attribute was prime. BCNF strictly disallows this!

BCNF Decomposition Rule:
If X -> Y violates BCNF:
Decompose R into:
  R1 = (X U Y) with X as Primary Key
  R2 = (R - Y) with Foreign Key referencing X

Our production schema (database/schema-ddl.sql) achieves 100% BCNF compliance:
- Every table has a single surrogate Primary Key (or minimal composite key).
- Every determinant is a candidate key / superkey.
- Zero update, delete, or insert anomalies.
--------------------------------------------------------------------------------
*/
