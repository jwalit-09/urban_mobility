package com.urbanmobility.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String action; // CREATE, UPDATE, DELETE, RAG_QUERY, TELEMETRY_ALERT

    @Column(nullable = false)
    private String entityName;

    private Long entityId;

    @Column(columnDefinition = "TEXT")
    private String details;

    private String performedBy;

    private LocalDateTime timestamp = LocalDateTime.now();

    public AuditLog() {}

    public AuditLog(String action, String entityName, Long entityId, String details, String performedBy) {
        this.action = action;
        this.entityName = entityName;
        this.entityId = entityId;
        this.details = details;
        this.performedBy = performedBy;
        this.timestamp = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getAction() { return action; }
    public String getEntityName() { return entityName; }
    public Long getEntityId() { return entityId; }
    public String getDetails() { return details; }
    public String getPerformedBy() { return performedBy; }
    public LocalDateTime getTimestamp() { return timestamp; }

    public void setId(Long id) { this.id = id; }
    public void setAction(String action) { this.action = action; }
    public void setEntityName(String entityName) { this.entityName = entityName; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }
    public void setDetails(String details) { this.details = details; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
