package com.urbanmobility.config;

import com.urbanmobility.model.TransitDocument;
import com.urbanmobility.repo.TransitDocumentRepository;
import com.urbanmobility.service.VectorStoreService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(2)
public class RagDataSeeder implements CommandLineRunner {

    private final TransitDocumentRepository docRepo;
    private final VectorStoreService vectorStore;

    public RagDataSeeder(TransitDocumentRepository docRepo, VectorStoreService vectorStore) {
        this.docRepo = docRepo;
        this.vectorStore = vectorStore;
    }

    @Override
    public void run(String... args) {
        if (docRepo.count() > 0) {
            vectorStore.refreshCache();
            return;
        }

        List<TransitDocument> defaultDocs = List.of(
                new TransitDocument(
                        "Airport Express Transit & Luggage Policy",
                        "ROUTE_GUIDE",
                        """
                        The Airport Express connects Central Station directly to the International & Domestic Terminals via City Mall and Tech Park. Total route distance is 18 km with an estimated scheduled transit duration of 35 minutes under free-flowing traffic.
                        
                        Luggage Regulations: Each passenger is permitted two pieces of checked luggage up to 30 kg each and one carry-on bag free of charge. Dedicated low-floor boarding ramps and spacious luggage racks are installed in coaches 1 and 2.
                        
                        Peak Advisory: During peak commuter windows (08:30-10:30 and 17:30-20:00), traffic bottlenecks near City Mall can add 10 to 15 minutes of delay. In case of severe delays, passengers are advised to transfer to the Metro Connector line at Central Station.
                        """,
                        "airport, luggage, express, central station, flight"
                ),

                new TransitDocument(
                        "Green Fleet: Electric Bus & Eco-Mobility Standards",
                        "FLEET_INFO",
                        """
                        Our urban mobility platform integrates zero-emission electric buses (such as TS09CD5678) operating on high-density corridors. These vehicles feature regenerative braking, automated battery thermal monitoring, and fast-charging turnaround.
                        
                        Carbon Footprint Metrics: Electric buses contribute 0 grams of direct tailpipe CO2 per passenger-kilometer, compared to 85 g/km for standard diesel buses. Passengers selecting eco-routes actively reduce citywide carbon emissions.
                        
                        Charging and Depot Policy: Electric buses are scheduled for 20-minute opportunity boosts at Lake View and Tech Park charging bays whenever battery level drops below 30%.
                        """,
                        "electric, ev, green, bus, battery, emission, co2"
                ),

                new TransitDocument(
                        "Dynamic Traffic Congestion & Detour Protocol",
                        "TRAFFIC_ADVISORY",
                        """
                        When traffic severity is flagged as HIGH or delays exceed 10 minutes along arterial roads (such as City Mall junction), automated route balancing algorithms activate secondary corridors.
                        
                        Detour Protocols: Vehicles departing Central Station are redirected via the Lake View Bypass to join Tech Park, bypassing congested commercial intersections. Route recalculation provides an updated ETA within 60 seconds of traffic incident reporting.
                        
                        Driver Instructions: Drivers must maintain communication with dispatch when stationary delay exceeds 5 minutes. Real-time telemetry automatically records incident locations for automated passenger notifications.
                        """,
                        "traffic, delay, detour, congestion, city mall, bypass"
                ),

                new TransitDocument(
                        "Multimodal Hubs & Station Amenities Guide",
                        "STATION_AMENITY",
                        """
                        Central Station acts as the core multimodal interchange connecting local commuter buses, rapid transit lines, and feeder e-shuttles. Amenities include wheelchair-accessible ramps, tactile floor paths for visually impaired commuters, real-time LED arrival boards, and 24/7 passenger assistance kiosks.
                        
                        Interchange Timings: Average transfer walk time between Bus Bay 3 and the Metro Connector platform is under 3 minutes via the skywalk.
                        
                        Lockers & Charging: Smart digital luggage lockers and high-speed mobile charging kiosks are situated beside Central Waiting Lounge A and Airport Departure Lounge B.
                        """,
                        "station, central, interchange, amenities, transfer, accessibility"
                ),

                new TransitDocument(
                        "Emergency Response, Safety & Lost Property Protocol",
                        "EMERGENCY",
                        """
                        Passenger safety is monitored round-the-clock. Every vehicle is fitted with GPS SOS beacons, onboard CCTV, and emergency door-release valves. In the event of a medical emergency or security threat, passengers can alert staff via the mobile platform or onboard panic switches.
                        
                        Helpline: Transit Emergency Response Cell can be reached immediately at helpline 1800-MOBILITY (toll-free) or emergency speed-dial 112.
                        
                        Lost and Found: Articles found on vehicles or at stops are cataloged in the Central Station lost-and-found repository within 4 hours. Passengers can verify property claims using vehicle number and travel timestamp.
                        """,
                        "emergency, safety, lost, found, helpline, police, medical"
                ),

                new TransitDocument(
                        "Fare Structure, Concessions & Smart Mobility Passes",
                        "TRANSIT_POLICY",
                        """
                        Fares across the network are calculated based on distance traveled, service class, and dynamic peak adjustments. Base fare is set at ₹10 for the first 3 km, plus ₹2.50 per subsequent kilometer.
                        
                        Concessions: Verified students receive a 40% discount on monthly transit passes. Senior citizens (aged 60+) and persons with disabilities travel at a 50% concession on non-peak journeys.
                        
                        Payment Methods: Contactless smart cards, UPI QR codes, and digital wallets are accepted at all turnstiles and onboard contactless validators.
                        """,
                        "fare, pass, ticket, discount, concession, payment, cost"
                )
        );

        for (TransitDocument doc : defaultDocs) {
            vectorStore.indexDocument(doc);
        }

        System.out.println(">>> Vector Database Knowledge Corpus Seeded: " + defaultDocs.size() + " documents indexed.");
    }
}
