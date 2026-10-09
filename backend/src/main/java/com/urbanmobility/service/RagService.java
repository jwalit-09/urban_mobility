package com.urbanmobility.service;

import com.urbanmobility.model.AuditLog;
import com.urbanmobility.model.Route;
import com.urbanmobility.model.TrafficUpdate;
import com.urbanmobility.repo.AuditLogRepository;
import com.urbanmobility.repo.RouteRepository;
import com.urbanmobility.repo.TrafficRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RagService {

    private final VectorStoreService vectorStore;
    private final RouteRepository routeRepo;
    private final TrafficRepository trafficRepo;
    private final AuditLogRepository auditRepo;

    public RagService(VectorStoreService vectorStore,
                      RouteRepository routeRepo,
                      TrafficRepository trafficRepo,
                      AuditLogRepository auditRepo) {
        this.vectorStore = vectorStore;
        this.routeRepo = routeRepo;
        this.trafficRepo = trafficRepo;
        this.auditRepo = auditRepo;
    }

    public record RagResponse(
            String query,
            String answer,
            double confidenceScore,
            List<VectorStoreService.VectorSearchResult> retrievedSources,
            List<String> liveTrafficAlerts,
            List<Map<String, Object>> recommendedRoutes,
            String timestamp
    ) {}

    public RagResponse ask(String query, String userEmail) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("Query cannot be empty");
        }

        // 1. Vector Database Semantic Retrieval
        List<VectorStoreService.VectorSearchResult> sources = vectorStore.similaritySearch(query, 3, 0.15);

        // 2. Fetch Live Relational Transit Context
        List<TrafficUpdate> activeTraffic = trafficRepo.findAll();
        List<Route> allRoutes = routeRepo.findAll();

        // 3. Grounded Synthesis
        StringBuilder answerBuilder = new StringBuilder();
        double topScore = sources.isEmpty() ? 0.0 : sources.get(0).similarityScore();

        List<String> alerts = new ArrayList<>();
        List<Map<String, Object>> matchedRoutes = new ArrayList<>();

        String lowerQuery = query.toLowerCase();

        // Check if query is route-oriented
        for (Route r : allRoutes) {
            if (lowerQuery.contains(r.getName().toLowerCase())
                    || lowerQuery.contains(r.getSource().toLowerCase())
                    || lowerQuery.contains(r.getDestination().toLowerCase())
                    || (lowerQuery.contains("airport") && r.getDestination().equalsIgnoreCase("Airport"))
                    || (lowerQuery.contains("electric") && "ELECTRIC_BUS".equalsIgnoreCase(r.getTransitMode()))) {
                matchedRoutes.add(Map.of(
                        "id", r.getId(),
                        "name", r.getName(),
                        "mode", r.getTransitMode() != null ? r.getTransitMode() : "BUS",
                        "distanceKm", r.getDistanceKm() != null ? r.getDistanceKm() : 0.0,
                        "baseMinutes", r.getBaseMinutes() != null ? r.getBaseMinutes() : 0,
                        "fare", r.getBaseFare() != null ? r.getBaseFare() : 20.0
                ));
            }
        }

        // Check relevant traffic alerts
        for (TrafficUpdate tu : activeTraffic) {
            if (tu.getRoute() != null) {
                String rName = tu.getRoute().getName().toLowerCase();
                if (lowerQuery.contains(rName) || lowerQuery.contains("traffic") || lowerQuery.contains("delay") || sourcesContain(sources, rName)) {
                    alerts.add(String.format("[%s] %s: %s (+%d min delay)",
                            tu.getSeverity(), tu.getRoute().getName(), tu.getMessage(), tu.getDelayMinutes()));
                }
            }
        }

        if (sources.isEmpty()) {
            answerBuilder.append("I searched the transit knowledge base and active database records, but found no exact semantic match for your inquiry. ");
            answerBuilder.append("You can check route details directly using our Route Planner or review live traffic advisories.");
        } else {
            // Synthesize contextual response based on the top retrieved knowledge chunk
            VectorStoreService.VectorSearchResult primary = sources.get(0);
            answerBuilder.append(generateContextualAnswer(query, primary, sources, alerts, matchedRoutes));
        }

        // Audit the RAG search
        auditRepo.save(new AuditLog(
                "RAG_QUERY",
                "VectorKnowledgeBase",
                sources.isEmpty() ? null : sources.get(0).chunkId(),
                "Query: " + query + " | Confidence: " + topScore,
                userEmail != null ? userEmail : "anonymous"
        ));

        return new RagResponse(
                query,
                answerBuilder.toString(),
                topScore,
                sources,
                alerts,
                matchedRoutes,
                java.time.LocalDateTime.now().toString()
        );
    }

    private boolean sourcesContain(List<VectorStoreService.VectorSearchResult> sources, String keyword) {
        for (VectorStoreService.VectorSearchResult s : sources) {
            if (s.chunkText().toLowerCase().contains(keyword)) return true;
        }
        return false;
    }

    private String generateContextualAnswer(String query,
                                            VectorStoreService.VectorSearchResult primary,
                                            List<VectorStoreService.VectorSearchResult> sources,
                                            List<String> alerts,
                                            List<Map<String, Object>> routes) {
        StringBuilder sb = new StringBuilder();

        // Topic-based synthesis
        String cat = primary.category();
        String title = primary.documentTitle();

        sb.append(String.format("Based on the **%s** (%s):\n\n", title, cat));
        sb.append(primary.chunkText()).append("\n\n");

        if (!alerts.isEmpty()) {
            sb.append("**⚠️ Live Traffic Advisory Notice:**\n");
            for (String a : alerts) {
                sb.append("- ").append(a).append("\n");
            }
            sb.append("\n");
        }

        if (!routes.isEmpty()) {
            sb.append("**Recommended System Routes:**\n");
            for (Map<String, Object> r : routes) {
                sb.append(String.format("- **%s** (%s) - %s km, ~%s min base (Fare: ₹%s)\n",
                        r.get("name"), r.get("mode"), r.get("distanceKm"), r.get("baseMinutes"), r.get("fare")));
            }
            sb.append("\n");
        }

        if (sources.size() > 1) {
            sb.append("**Additional Relevant Notes:**\n");
            for (int i = 1; i < sources.size(); i++) {
                VectorStoreService.VectorSearchResult s = sources.get(i);
                sb.append(String.format("- *From %s*: %s\n", s.documentTitle(), summarize(s.chunkText())));
            }
        }

        return sb.toString();
    }

    private String summarize(String text) {
        if (text.length() <= 160) return text;
        int dot = text.indexOf('.', 100);
        if (dot != -1 && dot < 200) {
            return text.substring(0, dot + 1);
        }
        return text.substring(0, Math.min(text.length(), 160)) + "...";
    }
}
