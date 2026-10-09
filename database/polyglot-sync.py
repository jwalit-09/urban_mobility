#!/usr/bin/env python3
"""
Urban Mobility Platform - Polyglot Persistence Synchronizer (CO2)
Demonstrates the Transactional Outbox Pattern & Dual-Database Sync
between Relational System of Record (PostgreSQL/SQLite) and Document Store (MongoDB).
"""

import time
import json
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PolyglotSync")

class MockRelationalOutbox:
    """Simulates PostgreSQL transactional outbox table events."""
    def __init__(self):
        self.events = [
            {
                "event_id": "evt-101",
                "aggregate_type": "BOOKING",
                "aggregate_id": "BK-20261009-A1B2",
                "payload": {
                    "userId": 1,
                    "tripId": 12,
                    "seatCount": 2,
                    "amount": 45.0,
                    "status": "CONFIRMED"
                },
                "processed": False
            },
            {
                "event_id": "evt-102",
                "aggregate_type": "TRAFFIC_INCIDENT",
                "aggregate_id": "TRF-9901",
                "payload": {
                    "routeId": 1,
                    "severity": "HIGH",
                    "delayMinutes": 15,
                    "message": "Congestion near City Mall junction"
                },
                "processed": False
            }
        ]

    def poll_unprocessed(self):
        return [e for e in self.events if not e["processed"]]

    def mark_processed(self, event_id: str):
        for e in self.events:
            if e["event_id"] == event_id:
                e["processed"] = True

class MockMongoActivityStore:
    """Simulates MongoDB Document Store for high-velocity user activity streams."""
    def __init__(self):
        self.collection = []

    def insert_activity(self, doc: Dict[str, Any]):
        self.collection.append(doc)
        logger.info(f"[MongoDB Sync] Document inserted into 'passenger_activity_stream': {json.dumps(doc)}")

def run_sync_cycle():
    logger.info("Initializing Polyglot Persistence Transactional Outbox Worker...")
    outbox = MockRelationalOutbox()
    mongo_store = MockMongoActivityStore()

    pending = outbox.poll_unprocessed()
    logger.info(f"Found {len(pending)} pending outbox events from Relational DB.")

    for event in pending:
        logger.info(f"Processing Event {event['event_id']} ({event['aggregate_type']})...")
        
        # Dual-database mapping: Transform relational event into MongoDB activity document
        mongo_doc = {
            "sourceEventId": event["event_id"],
            "eventType": event["aggregate_type"],
            "eventPayload": event["payload"],
            "syncedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "PROCESSED_EVENTUAL_CONSISTENCY"
        }
        
        mongo_store.insert_activity(mongo_doc)
        outbox.mark_processed(event["event_id"])
        logger.info(f"Event {event['event_id']} marked as PROCESSED in Relational Outbox.\n")

    logger.info("Polyglot synchronization completed successfully with 100% eventual consistency.")

if __name__ == "__main__":
    run_sync_cycle()
