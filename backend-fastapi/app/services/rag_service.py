from typing import List, Dict, Any
from datetime import datetime
from app.services.vector_service import vector_service
from app.repositories.data_store import data_store

class RagKnowledgeService:
    """
    RAG (Retrieval-Augmented Generation) Pipeline:
    1. Knowledge Corpus Indexing into Vector Store
    2. Approximate Nearest Neighbor (ANN) Semantic Retrieval
    3. Live Relational DB Context Injection (Active Traffic, Fleet status)
    4. Grounded Prompt Synthesis
    """
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.chunks: List[Dict[str, Any]] = []
        self._index_knowledge_corpus()

    def _index_knowledge_corpus(self):
        corpus = [
            {
                "title": "Airport Express Transit & Luggage Policy",
                "category": "ROUTE_GUIDE",
                "text": (
                    "The Airport Express connects Central Station directly to the International & Domestic Terminals via City Mall and Tech Park. "
                    "Total route distance is 18 km with an estimated scheduled transit duration of 35 minutes under free-flowing traffic. "
                    "Luggage Regulations: Each passenger is permitted two pieces of checked luggage up to 30 kg each and one carry-on bag free of charge. "
                    "Peak Advisory: During peak commuter windows (08:30-10:30 and 17:30-20:00), traffic bottlenecks near City Mall can add 10 to 15 minutes of delay. "
                    "In case of severe delays, passengers are advised to transfer to the Metro Connector line at Central Station."
                )
            },
            {
                "title": "Green Fleet: Electric Bus & Eco-Mobility Standards",
                "category": "FLEET_INFO",
                "text": (
                    "Our urban mobility platform integrates zero-emission electric buses (such as TS09CD5678) operating on high-density corridors. "
                    "These vehicles feature regenerative braking, automated battery thermal monitoring, and fast-charging turnaround. "
                    "Carbon Footprint Metrics: Electric buses contribute 0 grams of direct tailpipe CO2 per passenger-kilometer, compared to 85 g/km for diesel. "
                    "Charging and Depot Policy: Electric buses undergo 20-minute opportunity boosts at Lake View and Tech Park whenever battery drops below 30%."
                )
            },
            {
                "title": "Dynamic Traffic Congestion & Detour Protocol",
                "category": "TRAFFIC_ADVISORY",
                "text": (
                    "When traffic severity is flagged as HIGH or delays exceed 10 minutes along arterial roads (such as City Mall junction), "
                    "automated route balancing algorithms activate secondary corridors. "
                    "Detour Protocols: Vehicles departing Central Station are redirected via the Lake View Bypass to join Tech Park, bypassing congested intersections. "
                    "Route recalculation provides an updated ETA within 60 seconds of traffic incident reporting."
                )
            },
            {
                "title": "Multimodal Hubs & Station Amenities Guide",
                "category": "STATION_AMENITY",
                "text": (
                    "Central Station acts as the core multimodal interchange connecting local commuter buses, rapid transit lines, and feeder e-shuttles. "
                    "Amenities include wheelchair-accessible ramps, tactile floor paths for visually impaired commuters, real-time LED arrival boards, and 24/7 assistance kiosks. "
                    "Interchange Timings: Average transfer walk time between Bus Bay 3 and the Metro Connector platform is under 3 minutes via the skywalk."
                )
            },
            {
                "title": "Emergency Response & Passenger Safety Protocol",
                "category": "EMERGENCY",
                "text": (
                    "Passenger safety is monitored round-the-clock. Every vehicle is fitted with GPS SOS beacons, onboard CCTV, and emergency door-release valves. "
                    "Helpline: Transit Emergency Response Cell can be reached immediately at helpline 1800-MOBILITY (toll-free) or emergency speed-dial 112. "
                    "Lost and Found: Articles found on vehicles or at stops are cataloged in the Central Station lost-and-found repository within 4 hours."
                )
            },
            {
                "title": "Fare Structure, Concessions & Smart Mobility Passes",
                "category": "TRANSIT_POLICY",
                "text": (
                    "Fares across the network are calculated based on distance traveled, service class, and dynamic peak adjustments. "
                    "Base fare is set at ₹10 for the first 3 km, plus ₹2.50 per subsequent kilometer. "
                    "Concessions: Verified students receive a 40% discount on monthly transit passes. Senior citizens (aged 60+) receive 50% concession. "
                    "Payment Methods: Contactless smart cards, UPI QR codes, and digital wallets are accepted at all turnstiles."
                )
            }
        ]

        for i, item in enumerate(corpus):
            doc_id = i + 1
            embedding = vector_service.embed_text(f"{item['title']} {item['text']}")
            self.chunks.append({
                "chunk_id": doc_id,
                "document_title": item["title"],
                "category": item["category"],
                "chunk_text": item["text"],
                "embedding": embedding
            })

    def search_knowledge(self, query: str, top_k: int = 3, threshold: float = 0.15) -> List[Dict[str, Any]]:
        query_vec = vector_service.embed_text(query)
        scored = []
        for chunk in self.chunks:
            sim = vector_service.cosine_similarity(query_vec, chunk["embedding"])
            if sim >= threshold:
                scored.append({
                    "chunk_id": chunk["chunk_id"],
                    "document_title": chunk["document_title"],
                    "category": chunk["category"],
                    "chunk_text": chunk["chunk_text"],
                    "similarity_score": round(sim, 4)
                })
        scored.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored[:top_k]

    def ask(self, query: str, user_email: str = "passenger@mobility.com") -> Dict[str, Any]:
        retrieved = self.search_knowledge(query)
        
        # Inject live relational transit data
        active_traffic = data_store.get_all_traffic()
        routes = data_store.get_all_routes()

        traffic_alerts = []
        q_lower = query.lower()
        for t in active_traffic:
            r_name = t.get("route", {}).get("name", "")
            if r_name.lower() in q_lower or "traffic" in q_lower or "delay" in q_lower or "express" in q_lower:
                traffic_alerts.append(f"[{t.get('severity')}] {r_name}: {t.get('message')} (+{t.get('delay_minutes')} min delay)")

        recommended_routes = []
        for r in routes:
            if (r["name"].lower() in q_lower or r["source"].lower() in q_lower or r["destination"].lower() in q_lower
                    or ("airport" in q_lower and r["destination"] == "Airport")
                    or ("electric" in q_lower and r.get("transit_mode") == "ELECTRIC_BUS")):
                recommended_routes.append({
                    "id": r["id"],
                    "name": r["name"],
                    "mode": r.get("transit_mode", "BUS"),
                    "distance_km": r.get("distance_km"),
                    "base_minutes": r.get("base_minutes"),
                    "fare": r.get("base_fare")
                })

        # Grounded answer synthesis
        top_score = retrieved[0]["similarity_score"] if retrieved else 0.0
        if not retrieved:
            answer = "I searched the transit knowledge base, but found no matching information for your query. Please review our live Route Planner."
        else:
            primary = retrieved[0]
            answer = f"**Based on the {primary['document_title']} ({primary['category']}):**\n\n{primary['chunk_text']}"
            if traffic_alerts:
                answer += "\n\n**⚠️ Active Traffic Advisory:**\n" + "\n".join(f"- {a}" for a in traffic_alerts)
            if recommended_routes:
                answer += "\n\n**Recommended System Routes:**\n" + "\n".join(
                    f"- **{r['name']}** ({r['mode']}) - {r['distance_km']} km, ~{r['base_minutes']} min (Fare: ₹{r['fare']})"
                    for r in recommended_routes
                )

        return {
            "query": query,
            "answer": answer,
            "confidence_score": top_score,
            "retrieved_sources": retrieved,
            "live_traffic_alerts": traffic_alerts,
            "recommended_routes": recommended_routes,
            "timestamp": datetime.now().isoformat()
        }

rag_service = RagKnowledgeService()
