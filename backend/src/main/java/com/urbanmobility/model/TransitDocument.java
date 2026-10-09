package com.urbanmobility.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "transit_documents")
public class TransitDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category; // ROUTE_GUIDE, TRAFFIC_ADVISORY, TRANSIT_POLICY, EMERGENCY, FLEET_INFO

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private String tags;

    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DocumentChunk> chunks = new ArrayList<>();

    public TransitDocument() {}

    public TransitDocument(String title, String category, String content, String tags) {
        this.title = title;
        this.category = category;
        this.content = content;
        this.tags = tags;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getCategory() { return category; }
    public String getContent() { return content; }
    public String getTags() { return tags; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<DocumentChunk> getChunks() { return chunks; }

    public void setId(Long id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setCategory(String category) { this.category = category; }
    public void setContent(String content) { this.content = content; }
    public void setTags(String tags) { this.tags = tags; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setChunks(List<DocumentChunk> chunks) { this.chunks = chunks; }
}
