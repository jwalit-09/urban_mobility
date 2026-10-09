package com.urbanmobility.service;

import com.urbanmobility.model.DocumentChunk;
import com.urbanmobility.model.TransitDocument;
import com.urbanmobility.repo.DocumentChunkRepository;
import com.urbanmobility.repo.TransitDocumentRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VectorStoreService {

    private final TransitDocumentRepository docRepo;
    private final DocumentChunkRepository chunkRepo;
    private final EmbeddingService embeddingService;

    @Value("${app.rag.top-k:3}")
    private int defaultTopK;

    @Value("${app.rag.similarity-threshold:0.25}")
    private double defaultThreshold;

    // In-memory high speed vector cache: ChunkId -> Float Array
    private final Map<Long, float[]> vectorCache = new ConcurrentHashMap<>();

    public VectorStoreService(TransitDocumentRepository docRepo,
                              DocumentChunkRepository chunkRepo,
                              EmbeddingService embeddingService) {
        this.docRepo = docRepo;
        this.chunkRepo = chunkRepo;
        this.embeddingService = embeddingService;
    }

    @PostConstruct
    public void warmupVectorCache() {
        refreshCache();
    }

    public synchronized void refreshCache() {
        vectorCache.clear();
        List<DocumentChunk> allChunks = chunkRepo.findAll();
        for (DocumentChunk chunk : allChunks) {
            float[] vec = embeddingService.jsonToVector(chunk.getEmbeddingJson());
            vectorCache.put(chunk.getId(), vec);
        }
    }

    @Transactional
    public void indexDocument(TransitDocument doc) {
        // Remove existing chunks if re-indexing
        if (doc.getId() != null) {
            chunkRepo.deleteByDocumentId(doc.getId());
        }
        TransitDocument savedDoc = docRepo.save(doc);

        List<String> textChunks = chunkText(savedDoc.getContent());
        List<DocumentChunk> chunksToSave = new ArrayList<>();

        for (int i = 0; i < textChunks.size(); i++) {
            String text = textChunks.get(i);
            float[] vector = embeddingService.embedText(savedDoc.getTitle() + " " + text);
            String vectorJson = embeddingService.vectorToJson(vector);
            int tokenCount = text.split("\\s+").length;

            DocumentChunk chunk = new DocumentChunk(savedDoc, i + 1, text, vectorJson, tokenCount);
            chunksToSave.add(chunk);
        }

        List<DocumentChunk> savedChunks = chunkRepo.saveAll(chunksToSave);
        for (DocumentChunk sc : savedChunks) {
            float[] vec = embeddingService.jsonToVector(sc.getEmbeddingJson());
            vectorCache.put(sc.getId(), vec);
        }
    }

    public record VectorSearchResult(
            Long chunkId,
            Long documentId,
            String documentTitle,
            String category,
            Integer chunkIndex,
            String chunkText,
            double similarityScore
    ) {}

    public List<VectorSearchResult> similaritySearch(String query, Integer topK, Double minThreshold) {
        int k = (topK != null && topK > 0) ? topK : defaultTopK;
        double threshold = (minThreshold != null) ? minThreshold : defaultThreshold;

        float[] queryVector = embeddingService.embedText(query);
        List<DocumentChunk> chunks = chunkRepo.findAll();

        PriorityQueue<VectorSearchResult> pq = new PriorityQueue<>(Comparator.comparingDouble(VectorSearchResult::similarityScore));

        for (DocumentChunk chunk : chunks) {
            float[] chunkVec = vectorCache.computeIfAbsent(chunk.getId(),
                    id -> embeddingService.jsonToVector(chunk.getEmbeddingJson()));

            float sim = embeddingService.cosineSimilarity(queryVector, chunkVec);
            if (sim >= threshold) {
                TransitDocument doc = chunk.getDocument();
                String title = doc != null ? doc.getTitle() : "Unknown Document";
                String category = doc != null ? doc.getCategory() : "GENERAL";
                Long docId = doc != null ? doc.getId() : null;

                VectorSearchResult result = new VectorSearchResult(
                        chunk.getId(),
                        docId,
                        title,
                        category,
                        chunk.getChunkIndex(),
                        chunk.getChunkText(),
                        Math.round(sim * 1000.0) / 1000.0
                );

                pq.offer(result);
                if (pq.size() > k) {
                    pq.poll();
                }
            }
        }

        List<VectorSearchResult> results = new ArrayList<>(pq);
        results.sort((a, b) -> Double.compare(b.similarityScore(), a.similarityScore()));
        return results;
    }

    @Transactional
    public int reindexAll() {
        List<TransitDocument> docs = docRepo.findAll();
        chunkRepo.deleteAll();
        vectorCache.clear();
        for (TransitDocument doc : docs) {
            indexDocument(doc);
        }
        return docs.size();
    }

    private List<String> chunkText(String fullText) {
        List<String> chunks = new ArrayList<>();
        if (fullText == null || fullText.isBlank()) return chunks;

        String[] paragraphs = fullText.split("\n\n+");
        for (String p : paragraphs) {
            String trimmed = p.trim();
            if (!trimmed.isBlank()) {
                chunks.add(trimmed);
            }
        }
        return chunks.isEmpty() ? List.of(fullText) : chunks;
    }
}
