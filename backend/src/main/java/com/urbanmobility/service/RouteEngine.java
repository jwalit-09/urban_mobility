package com.urbanmobility.service;

import com.urbanmobility.model.*;
import com.urbanmobility.repo.TrafficRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RouteEngine {
    private final TrafficRepository trafficRepository;

    public RouteEngine(TrafficRepository trafficRepository){
        this.trafficRepository=trafficRepository;
    }

    public Map<String,Object> calculate(List<Route> routes, String source, String destination){
        return calculate(routes, source, destination, "FASTEST");
    }

    public Map<String,Object> calculate(List<Route> routes, String source, String destination, String preference){
        String pref = (preference != null && !preference.isBlank()) ? preference.trim().toUpperCase() : "FASTEST";

        Map<String, Object> fastest = solveDijkstra(routes, source, destination, "FASTEST");
        Map<String, Object> eco = solveDijkstra(routes, source, destination, "ECO");
        Map<String, Object> budget = solveDijkstra(routes, source, destination, "BUDGET");

        Map<String, Object> selected;
        switch (pref) {
            case "ECO" -> selected = eco;
            case "BUDGET" -> selected = budget;
            default -> selected = fastest;
        }

        Map<String, Object> response = new LinkedHashMap<>(selected);
        response.put("preferenceApplied", pref);
        response.put("comparison", Map.of(
                "fastest", fastest,
                "eco", eco,
                "budget", budget
        ));

        return response;
    }

    private Map<String,Object> solveDijkstra(List<Route> routes, String source, String destination, String criteria){
        Map<String,List<Edge>> graph = new HashMap<>();

        for(Route route : routes){
            List<Stop> stops = route.getStops();
            if (stops == null || stops.size() < 2) continue;

            double segDistance = route.getDistanceKm() == null ? 3.0 : route.getDistanceKm() / Math.max(1, stops.size() - 1);
            double baseTimePerSeg = route.getBaseMinutes() == null ? 10.0 : route.getBaseMinutes() / (double) Math.max(1, stops.size() - 1);
            double trafficMult = trafficMultiplier(route);
            double timeCost = baseTimePerSeg * trafficMult;

            double co2PerKm = route.getCo2GramsPerKm() != null ? route.getCo2GramsPerKm() : 65.0;
            if ("ELECTRIC_BUS".equalsIgnoreCase(route.getTransitMode())) co2PerKm = 0.0;
            else if ("METRO".equalsIgnoreCase(route.getTransitMode())) co2PerKm = 30.0;
            double co2Cost = segDistance * co2PerKm;

            double fareCost = (route.getBaseFare() != null ? route.getBaseFare() : 20.0) / Math.max(1, stops.size() - 1);

            double weight;
            switch(criteria){
                case "ECO" -> weight = (timeCost * 0.4) + (co2Cost * 0.6);
                case "BUDGET" -> weight = (timeCost * 0.3) + (fareCost * 1.5);
                default -> weight = timeCost;
            }

            for(int i = 0; i < stops.size() - 1; i++){
                String a = stops.get(i).getName();
                String b = stops.get(i + 1).getName();
                graph.computeIfAbsent(a, k -> new ArrayList<>()).add(new Edge(b, weight, timeCost, co2Cost, fareCost, segDistance, route));
                graph.computeIfAbsent(b, k -> new ArrayList<>()).add(new Edge(a, weight, timeCost, co2Cost, fareCost, segDistance, route));
            }
        }

        if(!graph.containsKey(source) || !graph.containsKey(destination)){
            throw new IllegalArgumentException("Source '" + source + "' or destination '" + destination + "' stop not found");
        }

        Map<String, Double> dist = new HashMap<>();
        Map<String, String> prev = new HashMap<>();
        Map<String, Edge> prevEdge = new HashMap<>();
        PriorityQueue<Node> pq = new PriorityQueue<>(Comparator.comparingDouble(n -> n.cost));

        dist.put(source, 0.0);
        pq.add(new Node(source, 0.0));

        while(!pq.isEmpty()){
            Node cur = pq.poll();
            if(cur.cost > dist.getOrDefault(cur.name, Double.MAX_VALUE)) continue;
            if(cur.name.equals(destination)) break;

            for(Edge e : graph.getOrDefault(cur.name, List.of())){
                double nd = cur.cost + e.weight;
                if(nd < dist.getOrDefault(e.to, Double.MAX_VALUE)){
                    dist.put(e.to, nd);
                    prev.put(e.to, cur.name);
                    prevEdge.put(e.to, e);
                    pq.add(new Node(e.to, nd));
                }
            }
        }

        if(!dist.containsKey(destination)) {
            throw new IllegalArgumentException("No path found between " + source + " and " + destination);
        }

        LinkedList<String> path = new LinkedList<>();
        String x = destination;
        double totalTime = 0.0;
        double totalCo2 = 0.0;
        double totalFare = 0.0;
        double totalDistance = 0.0;
        Set<String> routeNames = new LinkedHashSet<>();
        Set<String> modesUsed = new LinkedHashSet<>();

        while(x != null){
            path.addFirst(x);
            Edge edge = prevEdge.get(x);
            if(edge != null){
                totalTime += edge.timeCost;
                totalCo2 += edge.co2Cost;
                totalFare += edge.fareCost;
                totalDistance += edge.distanceKm;
                if(edge.route != null) {
                    routeNames.add(edge.route.getName());
                    modesUsed.add(edge.route.getTransitMode() != null ? edge.route.getTransitMode() : "BUS");
                }
            }
            x = prev.get(x);
        }

        Map<String,Object> result = new LinkedHashMap<>();
        result.put("criteria", criteria);
        result.put("source", source);
        result.put("destination", destination);
        result.put("stops", path);
        result.put("estimatedMinutes", Math.round(totalTime * 10.0) / 10.0);
        result.put("distanceKm", Math.round(totalDistance * 10.0) / 10.0);
        result.put("co2Grams", Math.round(totalCo2 * 10.0) / 10.0);
        result.put("co2SavedVsCarGrams", Math.round(Math.max(0, (totalDistance * 170.0) - totalCo2) * 10.0) / 10.0);
        result.put("estimatedFare", Math.round(Math.max(15.0, totalFare) * 10.0) / 10.0);
        result.put("routesUsed", routeNames);
        result.put("modesUsed", modesUsed);
        result.put("algorithm", "Multi-Criteria Dijkstra (" + criteria + ") with Dynamic Traffic Multipliers");
        return result;
    }

    private double trafficMultiplier(Route route){
        return trafficRepository.findAll().stream()
                .filter(t -> t.getRoute() != null && t.getRoute().getId().equals(route.getId()))
                .map(TrafficUpdate::getSeverity)
                .map(s -> switch(s){
                    case LOW -> 1.0;
                    case MEDIUM -> 1.35;
                    case HIGH -> 1.8;
                }).max(Double::compareTo).orElse(1.0);
    }

    private record Edge(String to, double weight, double timeCost, double co2Cost, double fareCost, double distanceKm, Route route){}
    private record Node(String name, double cost){}
}
