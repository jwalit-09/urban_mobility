package com.urbanmobility.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
public class EmbeddingService {

    public static final int VECTOR_DIMENSION = 128;
    private final ObjectMapper mapper = new ObjectMapper();

    // Semantic Concept Clusters mapped to dense orthogonal coordinate spaces
    private static final Map<String, Integer> CONCEPT_CLUSTERS = new HashMap<>();

    static {
        // Cluster 0: Airport & Terminals & Flight
        registerCluster(0, "airport", "flight", "terminal", "plane", "international", "domestic", "departures", "arrivals", "express");
        // Cluster 1: Luggage & Baggage
        registerCluster(1, "luggage", "baggage", "suitcase", "trolley", "carryon", "weight", "allowance", "cargo");
        // Cluster 2: Electric Bus & Eco-friendly Transit
        registerCluster(2, "electric", "ev", "battery", "green", "clean", "emission", "eco", "charging", "sustainable", "zero");
        // Cluster 3: Traffic & Delays & Congestion
        registerCluster(3, "traffic", "delay", "jam", "congestion", "slow", "bottleneck", "accident", "incident", "detour", "peak");
        // Cluster 4: Metro & Trains & Stations
        registerCluster(4, "metro", "train", "rail", "station", "platform", "interchange", "feeder", "corridor", "line");
        // Cluster 5: Emergency & Safety & Lost and Found
        registerCluster(5, "emergency", "police", "helpline", "security", "lost", "found", "medical", "ambulance", "safety", "sos");
        // Cluster 6: Fares & Tickets & Passes
        registerCluster(6, "fare", "ticket", "pass", "card", "discount", "student", "senior", "concession", "cost", "price", "payment");
        // Cluster 7: Central Station & Hubs
        registerCluster(7, "central", "junction", "mall", "lake", "view", "tech", "park", "destination", "source", "stop");
    }

    private static void registerCluster(int clusterId, String... keywords) {
        for (String kw : keywords) {
            CONCEPT_CLUSTERS.put(kw.toLowerCase(), clusterId);
        }
    }

    /**
     * Generates a 128-dimensional dense semantic vector for input text.
     * Combines semantic cluster projection, subword n-gram hashing, and L2 normalization.
     */
    public float[] embedText(String text) {
        if (text == null || text.isBlank()) {
            return new float[VECTOR_DIMENSION];
        }

        float[] vector = new float[VECTOR_DIMENSION];
        String clean = text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ");
        String[] tokens = clean.split("\\s+");

        for (String token : tokens) {
            if (token.isBlank() || isStopWord(token)) continue;

            // 1. Concept Cluster Projection (dense activation in assigned sub-band)
            Integer clusterId = CONCEPT_CLUSTERS.get(token);
            if (clusterId != null) {
                int baseIdx = (clusterId * 16) % VECTOR_DIMENSION;
                for (int offset = 0; offset < 16; offset++) {
                    int idx = (baseIdx + offset) % VECTOR_DIMENSION;
                    vector[idx] += 3.5f * (float) Math.cos(offset * 0.4);
                }
            }

            // 2. Subword n-gram Hashing for continuous semantic representation of any word
            addTokenHash(token, vector, 1.2f);
            if (token.length() >= 4) {
                for (int i = 0; i <= token.length() - 3; i++) {
                    String trigram = token.substring(i, i + 3);
                    addTokenHash(trigram, vector, 0.4f);
                }
            }
        }

        // L2 Normalization so cosine similarity is directly dot product
        return l2Normalize(vector);
    }

    private void addTokenHash(String term, float[] vector, float weight) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(term.getBytes(StandardCharsets.UTF_8));
            for (int i = 0; i < 8; i++) {
                int idx = Math.abs((hash[i * 2] << 8) | (hash[i * 2 + 1] & 0xFF)) % VECTOR_DIMENSION;
                float sign = ((hash[i] & 1) == 0) ? 1.0f : -1.0f;
                vector[idx] += sign * weight;
            }
        } catch (Exception e) {
            int idx = Math.abs(term.hashCode()) % VECTOR_DIMENSION;
            vector[idx] += weight;
        }
    }

    public float cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0f;
        float dot = 0f;
        float normA = 0f;
        float normB = 0f;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA <= 0 || normB <= 0) return 0f;
        return (float) (dot / (Math.sqrt(normA) * Math.sqrt(normB)));
    }

    public String vectorToJson(float[] vector) {
        try {
            return mapper.writeValueAsString(vector);
        } catch (Exception e) {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < vector.length; i++) {
                sb.append(vector[i]);
                if (i < vector.length - 1) sb.append(",");
            }
            sb.append("]");
            return sb.toString();
        }
    }

    public float[] jsonToVector(String json) {
        try {
            return mapper.readValue(json, new TypeReference<float[]>() {});
        } catch (Exception e) {
            return new float[VECTOR_DIMENSION];
        }
    }

    private float[] l2Normalize(float[] v) {
        float sumSquares = 0f;
        for (float val : v) sumSquares += val * val;
        if (sumSquares <= 0) return v;
        float norm = (float) Math.sqrt(sumSquares);
        float[] normalized = new float[v.length];
        for (int i = 0; i < v.length; i++) {
            normalized[i] = v[i] / norm;
        }
        return normalized;
    }

    private boolean isStopWord(String word) {
        return Set.of("the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "for",
                "of", "it", "with", "as", "by", "this", "that", "are", "be").contains(word);
    }
}
