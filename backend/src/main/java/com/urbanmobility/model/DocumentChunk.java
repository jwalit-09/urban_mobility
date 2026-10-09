package com.urbanmobility.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_chunks")
public class DocumentChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @JsonIgnore
    private TransitDocument document;

    private Integer chunkIndex;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String chunkText;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String embeddingJson; // serialized float[] dense vector (e.g. 128 dimensions)

    private Integer tokenCount;

    private LocalDateTime createdAt = LocalDateTime.now();

    public DocumentChunk() {}

    public DocumentChunk(TransitDocument document, Integer chunkIndex, String chunkText, String embeddingJson, Integer tokenCount) {
        this.document = document;
        this.chunkIndex = chunkIndex;
        this.chunkText = chunkText;
        this.embeddingJson = embeddingJson;
        this.tokenCount = tokenCount;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public TransitDocument getDocument() { return document; }
    public Integer getChunkIndex() { return chunkIndex; }
    public String getChunkText() { return chunkText; }
    public String getEmbeddingJson() { return embeddingJson; }
    public Integer getTokenCount() { return tokenCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setId(Long id) { this.id = id; }
    public void setDocument(TransitDocument document) { this.document = document; }
    public void setChunkIndex(Integer chunkIndex) { this.chunkIndex = chunkIndex; }
    public void setChunkText(String chunkText) { this.chunkText = chunkText; }
    public void setEmbeddingJson(String embeddingJson) { this.embeddingJson = embeddingJson; }
    public void setTokenCount(Integer tokenCount) { this.tokenCount = tokenCount; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
