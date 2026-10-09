# SQL vs NoSQL Comparative Study & Polyglot Persistence (CO2)

This study provides a rigorous, architectural comparison between Relational Database Management Systems (RDBMS) and NoSQL Document/Key-Value stores in the context of the **Urban Mobility Platform**.

---

## 1. Architectural & Theoretical Foundations

| Dimension | Relational (PostgreSQL / MySQL) | Document NoSQL (MongoDB) | In-Memory / Key-Value (Redis) |
| :--- | :--- | :--- | :--- |
| **Primary Data Model** | Relational Tables (Tuples, Columns) | Hierarchical BSON Documents | Key-Value / In-Memory Data Structures |
| **Schema Paradigm** | Schema-on-Write (Strict DDL, Typing) | Schema-on-Read / BSON JSONSchema | Schemaless / String / Hash / Stream |
| **Transactions** | ACID (Strict Isolation, 2PC support) | Document-level ACID / Multi-doc Txns | Single-command atomicity / Multi-Exec |
| **Scaling Strategy** | Vertical (Scale-Up) + Read Replicas | Horizontal (Scale-Out Sharding) | In-memory clustering + Sentinel |
| **Integrity Enforcement** | Declarative PK, FK, CHECK constraints | Application-level / Optional Validator | Application-level |
| **Best Suited For** | Financials, Bookings, Fixed Topology | High-Velocity IoT Telemetry, Reviews | Real-time Caching, Pub/Sub, Rate Limits |

---

## 2. The CAP Theorem & PACELC Extension

Eric Brewer's **CAP Theorem** states that a distributed data store can guarantee at most two out of three properties simultaneously:
1. **Consistency (C)**: Every read receives the most recent write or an error.
2. **Availability (A)**: Every non-failing node returns a non-error response, without guaranteeing it contains the most recent write.
3. **Partition Tolerance (P)**: The system continues to operate despite arbitrary network message losses or delays.

Because network partitions ($P$) are unavoidable in physical distributed systems, distributed architectures must choose between **CP** and **AP**.

### PACELC Extension:
Daniel Abadi extended CAP: **If Partition ($P$)**, choose between Availability ($A$) and Consistency ($C$); **Else ($E$)**, choose between Latency ($L$) and Consistency ($C$).

### Mapping to Urban Mobility:
- **Trip Ticketing & Reservations (PostgreSQL)**: **CP / PC/EC**. Strict consistency is mandatory. We cannot tolerate double-selling a transit seat or charging duplicate fares.
- **GPS Telemetry Stream (MongoDB)**: **AP / PA/EL**. Availability and low latency are prioritized over immediate global consistency. If one telemetry ping is dropped or eventual, the next ping in 2 seconds corrects the vehicle trajectory.
- **Driver Location Cache (Redis)**: **PA/EL**. Sub-millisecond latency for live map updates with eventual consistency.

---

## 3. Storage Patterns & Database Engines

```
+-----------------------------------------------------------------------------------+
|                           URBAN MOBILITY DATA INVENTORY                           |
+-----------------------------------------------------------------------------------+
| 1. Relational (RDBMS)   | PostgreSQL 15 | Users, Routes, Stops, Trips, Bookings   |
| 2. Vector DB (pgvector) | PostgreSQL 15 | Transit Policy, RAG Semantic Embeddings |
| 3. Document NoSQL       | MongoDB 8     | Telemetry IoT Stream, Rider Feedback    |
| 4. In-Memory Cache      | Redis 7       | Real-Time Positions, Auth Sessions      |
+-----------------------------------------------------------------------------------+
```

---

## 4. SQL + NoSQL Integration (Polyglot Persistence)

Rather than forcing a single database engine to handle conflicting workloads, our platform applies **Polyglot Persistence**:

1. **System of Record (SoR)**: PostgreSQL stores definitive relational topology, financial transactions, and RBAC security credentials.
2. **IoT Stream Store**: MongoDB ingests high-frequency telemetry pings from thousands of moving vehicles without locking relational tables.
3. **Dual-Database Consistency Strategy**:
   - **Transactional Outbox Pattern**: When a Trip is booked in PostgreSQL, an outbox event is committed in the same database transaction. An asynchronous worker forwards this event to MongoDB to update rider travel activity logs.
   - **Eventual Consistency**: Redis caches live vehicle coordinates; if Redis restarts, the current location is reconciled from MongoDB telemetry streams.
