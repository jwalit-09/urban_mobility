"""
Urban Mobility Platform - Django REST Framework (DRF) Reference (CO3)
Demonstrates DRF Serializer, ModelViewSet, and DefaultRouter patterns.
"""

class MockDRFSerializer:
    def __init__(self, instance=None, data=None):
        self.instance = instance
        self.data_in = data

    def is_valid(self):
        return self.data_in is not None and "name" in self.data_in

    @property
    def data(self):
        return self.instance

class RouteModelViewSet:
    """Simulates DRF ModelViewSet with automatic CRUD action handlers."""
    def list(self):
        return [
            {"id": 1, "name": "Airport Express", "source": "Central Station", "destination": "Airport"},
            {"id": 2, "name": "Metro Connector", "source": "Central Station", "destination": "Airport"}
        ]

    def create(self, validated_data):
        return {"id": 3, **validated_data, "status": "CREATED_VIA_DRF"}

if __name__ == "__main__":
    viewset = RouteModelViewSet()
    print("Django REST Framework (DRF) Reference Initialized.")
    print("Simulated DRF ViewSet List Output:", viewset.list())
