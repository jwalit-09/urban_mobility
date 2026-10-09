# OWASP Top 10 API Security Compliance Guide (CO6)

The **Urban Mobility Platform** integrates rigorous defensive controls adhering to the **OWASP API Security Top 10 (2023)** standard.

---

| OWASP Vulnerability | Threat Description | Platform Defensive Mitigation | Code Implementation |
| :--- | :--- | :--- | :--- |
| **API1:2023 Broken Object Level Authorization (BOLA)** | Attacker accesses unauthorized records by tampering with IDs in URIs (`/api/trips/102`). | Strict user ownership verification before modifying bookings or driver assignments; scoped tenant queries. | `dependencies.py` (`get_current_user`), `sp_book_transit_ticket` |
| **API2:2023 Broken Authentication** | Compromised credentials, weak token signing, lack of expiration. | Signed JWT tokens with HMAC-SHA256 / RS256, 24-hour expiration (`exp`), bcrypt / PBKDF2 password hashing. | `security.py`, `JwtFilter.java` |
| **API3:2023 Broken Object Property Level Authorization** | Mass assignment attacks sending extra parameters (e.g. `is_admin=true`). | Pydantic v2 schemas and Java DTOs explicitly whitelisting acceptable input fields; strict JSON deserialization. | `schemas/auth.py`, `RouteRequest.java` |
| **API4:2023 Unrestricted Resource Consumption** | DoS attacks exhausting CPU/memory with unbounded queries or payload floods. | Token bucket / sliding window rate limiting on sensitive auth endpoints; maximum pagination limits (`limit=50`). | `middleware.py`, `k8s/06-hpa.yaml` |
| **API5:2023 Broken Function Level Authorization (BFLA)** | Regular commuter invoking administrative route deletion or vehicle decommission. | Declarative Role-Based Access Control (RBAC): `require_role(["ADMIN"])` in FastAPI, `@PreAuthorize("hasRole('ADMIN')")` in Spring. | `RouteController.java`, `routes.py` |
| **API6:2023 Unrestricted Access to Sensitive Business Flows** | Bots spamming ticket bookings to lock capacity. | Distributed Saga Orchestrator requires authenticated session and atomic capacity reservations. | `saga_service.py` |
| **API7:2023 Server Side Request Forgery (SSRF)** | Gateway tricked into proxying requests to private internal resources. | Whitelisted reverse proxy upstream URLs strictly restricted to internal Docker/K8s service DNS. | `gateway.py` |
| **API8:2023 Security Misconfiguration** | Verbose stack traces in production, open CORS, unpatched defaults. | Centralized Exception Handler returning sanitized error messages; strict CORS origin whitelisting. | `main.py`, `SecurityConfig.java` |
| **API9:2023 Improper Inventory Management** | Blind spots from unmaintained API versions or hidden endpoints. | Standardized OpenAPI 3.0 documentation auto-generated at `/docs` and `/v3/api-docs` with explicit versioning (`/api/v1`). | `app/main.py`, `springdoc` |
| **API10:2023 Unsafe Consumption of APIs** | Cascading failures when downstream third-party or microservices fail. | Circuit Breaker pattern with failure thresholds, configurable request timeouts, and automated fallback handlers. | `gateway.py` |
