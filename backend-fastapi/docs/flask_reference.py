"""
Urban Mobility Platform - Flask Self-Learning Reference Architecture (CO3)
Demonstrates Flask WSGI Application, Blueprints, and RESTful routing patterns.
"""

# Conceptual runnable reference matching Flask architecture
class FlaskTransitApp:
    def __init__(self):
        self.routes = {}

    def route(self, rule: str, methods=None):
        methods = methods or ["GET"]
        def decorator(f):
            self.routes[(rule, tuple(sorted(methods)))] = f
            return f
        return decorator

    def dispatch(self, path: str, method: str):
        for (rule, methods), handler in self.routes.items():
            if rule == path and method in methods:
                return handler()
        return {"error": "Not Found", "status": 404}

app = FlaskTransitApp()

# Route Blueprint
@app.route("/api/routes", methods=["GET"])
def get_routes():
    """Flask handler: returns serialized transit routes."""
    return [
        {"id": 1, "name": "Airport Express", "distanceKm": 18.0, "status": "ACTIVE"},
        {"id": 2, "name": "Metro Connector", "distanceKm": 21.0, "status": "ACTIVE"}
    ]

@app.route("/api/health", methods=["GET"])
def health():
    return {"framework": "Flask 3.x", "status": "UP", "ws_server": "Gunicorn / Werkzeug"}

if __name__ == "__main__":
    print("Flask Reference Architecture initialized.")
    print("Sample GET /api/routes dispatch:", app.dispatch("/api/routes", "GET"))
