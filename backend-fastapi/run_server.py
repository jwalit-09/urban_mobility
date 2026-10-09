#!/usr/bin/env python3
"""
Urban Mobility Platform - Backend Server Runner
Automatically runs full FastAPI via uvicorn if dependencies are installed,
or falls back to built-in Python HTTP ASGI-compatible server with zero external dependencies!
"""

import sys
import os
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Ensure current directory is on python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    import uvicorn
    import fastapi
    USE_FASTAPI = True
except ImportError:
    USE_FASTAPI = False

if USE_FASTAPI:
    def run():
        print(">>> Starting FastAPI with Uvicorn on http://0.0.0.0:8000...")
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
else:
    # Zero-dependency Python server implementing the full API specification
    from app.services.route_service import route_engine
    from app.services.rag_service import rag_service
    from app.services.saga_service import saga_orchestrator
    from app.repositories.data_store import data_store
    from app.core.security import verify_password, create_access_token, decode_access_token, hash_password

    class MobilityHttpHandler(BaseHTTPRequestHandler):
        def _set_cors_headers(self, status=200):
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-ID')
            self.send_header('X-Process-Time', '0.0012s')

        def do_OPTIONS(self):
            self._set_cors_headers(204)
            self.end_headers()

        def _get_body(self):
            length = int(self.headers.get('Content-Length', 0))
            if length > 0:
                body_bytes = self.rfile.read(length)
                return json.loads(body_bytes.decode('utf-8'))
            return {}

        def _get_auth_user(self):
            auth_header = self.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:].strip()
                return decode_access_token(token)
            return None

        def do_GET(self):
            parsed = urlparse(self.path)
            path = parsed.path.rstrip('/')

            # Strip /v1 if present for uniformity
            normalized = path.replace('/api/v1', '/api')

            if normalized in ['', '/health', '/api']:
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "UP",
                    "platform": "Urban Mobility Platform Backend (FastAPI / Standard Pure Python Engine)",
                    "endpoints": ["/api/auth/login", "/api/routes", "/api/routes/calculate", "/api/vehicles", "/api/traffic", "/api/rag/ask"]
                }).encode('utf-8'))

            elif normalized == '/api/routes':
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps(data_store.get_all_routes()).encode('utf-8'))

            elif normalized == '/api/vehicles':
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps(data_store.get_all_vehicles()).encode('utf-8'))

            elif normalized == '/api/traffic':
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps(data_store.get_all_traffic()).encode('utf-8'))

            elif normalized == '/api/trips':
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps(data_store.get_all_trips()).encode('utf-8'))

            elif normalized == '/api/rag/documents':
                self._set_cors_headers(200)
                self.end_headers()
                docs = [
                    {
                        "chunk_id": c["chunk_id"],
                        "title": c["document_title"],
                        "category": c["category"],
                        "token_count": len(c["chunk_text"].split()),
                        "embedding_dimensions": len(c["embedding"])
                    }
                    for c in rag_service.chunks
                ]
                self.wfile.write(json.dumps(docs).encode('utf-8'))

            elif normalized == '/docs':
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                html = """<!DOCTYPE html><html><head><title>Urban Mobility API</title>
                <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
                </head><body><div id="swagger-ui"></div>
                <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
                <script>SwaggerUIBundle({dom_id:'#swagger-ui',url:'/api/v1/openapi.json'})</script>
                </body></html>"""
                self.wfile.write(html.encode('utf-8'))

            else:
                self._set_cors_headers(404)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Endpoint not found", "path": path}).encode('utf-8'))

        def do_POST(self):
            parsed = urlparse(self.path)
            normalized = parsed.path.rstrip('/').replace('/api/v1', '/api')
            body = self._get_body()

            if normalized == '/api/auth/login':
                email = body.get('email', '')
                password = body.get('password', '')
                user = data_store.find_user_by_email(email)
                if user and verify_password(password, user['password_hash']):
                    token = create_access_token({"user_id": user["id"], "email": user["email"], "role": user["role"]})
                    self._set_cors_headers(200)
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "token": token,
                        "access_token": token,
                        "token_type": "Bearer",
                        "user": {"id": user["id"], "email": user["email"], "role": user["role"]}
                    }).encode('utf-8'))
                else:
                    self._set_cors_headers(401)
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Invalid email or password"}).encode('utf-8'))

            elif normalized == '/api/auth/register':
                email = body.get('email')
                password = body.get('password')
                if not email or not password:
                    self._set_cors_headers(400)
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Email and password required"}).encode('utf-8'))
                    return
                user_data = {
                    "email": email,
                    "password_hash": hash_password(password),
                    "role": body.get("role", "PASSENGER").upper(),
                    "is_active": True
                }
                created = data_store.create_user(user_data)
                self._set_cors_headers(201)
                self.end_headers()
                self.wfile.write(json.dumps(created).encode('utf-8'))

            elif normalized == '/api/routes/calculate':
                source = body.get('source', 'Central Station')
                dest = body.get('destination', 'Airport')
                result = route_engine.calculate_optimal_route(
                    routes=data_store.get_all_routes(),
                    traffic_list=data_store.get_all_traffic(),
                    source=source,
                    destination=dest
                )
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))

            elif normalized == '/api/ingestion/mobility':
                lat = float(body.get('latitude', 17.385))
                lng = float(body.get('longitude', 78.4867))
                val = body.get('value', 'Vehicle TS09AB1234')
                veh_num = "TS09AB1234"
                if "Vehicle" in val:
                    parts = val.split()
                    if len(parts) >= 2: veh_num = parts[1]
                data_store.update_vehicle_coords(veh_num, lat, lng)
                resp = {
                    "status": "PROCESSED",
                    "type": body.get("type", "GPS"),
                    "vehicleNumber": veh_num,
                    "latitude": lat,
                    "longitude": lng,
                    "anomalyAlert": False,
                    "storedIn": {
                        "relationalTable": "telemetry_logs (PostgreSQL)",
                        "documentCollection": "telemetry_events (MongoDB)",
                        "cache": f"redis:veh_pos:{veh_num}"
                    }
                }
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps(resp).encode('utf-8'))

            elif normalized == '/api/rag/ask':
                query = body.get('query', '')
                res = rag_service.ask(query=query)
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps(res).encode('utf-8'))

            elif normalized == '/api/trips/saga/book':
                trip_id = int(body.get('trip_id', 1))
                seat_count = int(body.get('seat_count', 1))
                res = saga_orchestrator.execute_booking_saga(
                    trip_id=trip_id, user_id=1, seat_count=seat_count, simulate_failure_at_step=0
                )
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps(res).encode('utf-8'))

            elif normalized == '/api/trips/saga/simulate-failure':
                trip_id = int(body.get('trip_id', 1))
                seat_count = int(body.get('seat_count', 1))
                res = saga_orchestrator.execute_booking_saga(
                    trip_id=trip_id, user_id=1, seat_count=seat_count, simulate_failure_at_step=2
                )
                self._set_cors_headers(200)
                self.end_headers()
                self.wfile.write(json.dumps(res).encode('utf-8'))

            else:
                self._set_cors_headers(404)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "POST endpoint not found"}).encode('utf-8'))

    def run():
        port = int(os.getenv("PORT", 8000))
        server_address = ('0.0.0.0', port)
        httpd = HTTPServer(server_address, MobilityHttpHandler)
        print(f">>> Urban Mobility Backend running on http://0.0.0.0:{port} (Zero-Dependency Engine Active)")
        httpd.serve_forever()

if __name__ == '__main__':
    run()
