from locust import HttpUser, task, between
import json

class UrbanMobilityCommuterUser(HttpUser):
    wait_time = between(0.5, 2.0)

    def on_start(self):
        """Authenticate user on startup and store bearer token."""
        login_payload = {
            "email": "user@mobility.com",
            "password": "user123"
        }
        res = self.client.post("/api/auth/login", json=login_payload)
        if res.status_code == 200:
            data = res.json()
            token = data.get("token") or data.get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}

    @task(3)
    def calculate_route(self):
        """Simulate frequent route calculations (Dijkstra algorithm)."""
        payload = {
            "source": "Central Station",
            "destination": "Airport"
        }
        self.client.post("/api/routes/calculate", json=payload, headers=self.headers)

    @task(2)
    def ask_rag_assistant(self):
        """Simulate AI transit knowledge inquiries (Semantic vector search)."""
        payload = {
            "query": "What is the luggage policy on the Airport Express?"
        }
        self.client.post("/api/rag/ask", json=payload, headers=self.headers)

    @task(4)
    def view_routes_and_traffic(self):
        """Simulate viewing dashboard routes and traffic alerts."""
        self.client.get("/api/routes", headers=self.headers)
        self.client.get("/api/traffic", headers=self.headers)

    @task(1)
    def book_trip_saga(self):
        """Simulate distributed Saga booking transaction."""
        payload = {
            "trip_id": 1,
            "seat_count": 1
        }
        self.client.post("/api/trips/saga/book", json=payload, headers=self.headers)
