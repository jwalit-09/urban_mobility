# Microservices Engineering & Distributed Transactions (CO5)

This document details the microservices architecture, domain boundaries, database-per-service design, and distributed transaction mechanics of the **Urban Mobility Platform**.

---

## 1. Domain Decomposition & Service Boundaries

```
+-----------------------------------------------------------------------------------+
|                         CLIENT ACCESS (React Dashboard / Mobile)                  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v  Port 8000
+-----------------------------------------------------------------------------------+
|                      FASTAPI CENTRALIZED API GATEWAY                              |
|  - Token Verification (JWT)                - Request Correlation (X-Correlation-ID)|
|  - Rate Limiting (Token Bucket)            - Centralized Error Handling           |
|  - Token Header Forwarding (X-User-Id)     - Circuit Breaker Resilience           |
+-----------------------------------------------------------------------------------+
           |                                                      |
           v Forward /api/fleet & /api/routes                     v Forward /api/telemetry
+------------------------------------------+  +-------------------------------------+
| SPRING BOOT TRANSIT MICROSERVICE (8080)  |  | NODE.JS TELEMETRY MICROSERVICE (5000)|
| - Core Transit Routes & Network Topology |  | - High-Velocity IoT Sensor Stream   |
| - Vehicle Fleet & Driver Workforce       |  | - Live Passenger Activity Logs      |
| - Dijkstra Shortest Path Engine          |  | - Socket.io Real-Time Broadcasting  |
| - Trip Bookings & Seat Allocation        |  | - Rider Ratings & Sentiment Reviews |
+------------------------------------------+  +-------------------------------------+
                     |                                           |
                     v                                           v
+------------------------------------------+  +-------------------------------------+
|        POSTGRESQL 15 (System of Record)  |  |        MONGODB 8 (Document Store)   |
| - ACID Relational Tables (BCNF)          |  | - BSON Collections with 2dsphere    |
| - pgvector HNSW Vector Embeddings        |  | - High-throughput Write Pipeline    |
+------------------------------------------+  +-------------------------------------+
```

---

## 2. Distributed Transactions: 2PC vs Saga Pattern

In a distributed microservice ecosystem where each service owns its database (Database-per-Service pattern), atomic ACID transactions cannot cross network boundaries without specialized protocols.

### A. Two-Phase Commit (2PC):
- **Mechanism**: A central transaction coordinator executes a **Prepare Phase** (asks all participants if they can commit and locks resources) followed by a **Commit Phase** (instructs all to commit or abort).
- **Critical Drawbacks**:
  - **Blocking Protocol**: If the coordinator or any participant fails after locking, database locks remain held indefinitely, causing cascading thread exhaustion.
  - **Single Point of Failure**: Relies heavily on coordinator availability.
  - **Incompatible with NoSQL / Heterogeneous stores**: MongoDB and PostgreSQL do not share standard XA distributed transaction managers.

### B. The Saga Pattern (Adopted in Urban Mobility):
- **Mechanism**: A Saga is a sequence of local transactions. Each transaction updates data within a single service.
- **Compensating Actions**: If a local transaction fails, the Saga executes a series of compensating transactions that undo the changes made by the preceding local transactions.

---

## 3. Booking Saga Execution Flow in Urban Mobility

```
[Client] ---> POST /api/trips/saga/book
                  |
                  v
[Saga Orchestrator (FastAPI)]
   |
   |-- 1. Execute Local Txn: Reserve Seat in Spring Boot (PostgreSQL)
   |      (Decrements available_seats, status: PENDING_SAGA)
   |
   |-- 2. Execute Local Txn: Log Activity in Node.js (MongoDB)
   |      (Appends to passenger_activity_stream)
   |
   |-- 3. Issue Confirmation & Finalize Ticket
          |
          +---> SUCCESS: Return Booking Reference & QR Ticket
```

### When Failure Occurs (Simulated via `/api/trips/saga/simulate-failure`):
```
[Saga Orchestrator]
   |
   |-- Step 1 (PostgreSQL): Seat Reserved (OK)
   |-- Step 2 (MongoDB): Network Timeout / Service Down (FAILED!)
   |
   +---> INITIATE COMPENSATING TRANSACTION:
         Calls Compensating Action: DELETE /api/trips/compensate
         (Restores available_seats in PostgreSQL, sets status: CANCELLED)
         Saga Status: COMPENSATED (Zero data inconsistency)
```
