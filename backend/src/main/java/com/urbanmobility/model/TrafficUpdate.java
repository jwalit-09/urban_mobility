package com.urbanmobility.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class TrafficUpdate {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional=false)
    private Route route;

    @Enumerated(EnumType.STRING)
    private TrafficSeverity severity;

    private Integer delayMinutes;
    private String message;
    private LocalDateTime reportedAt = LocalDateTime.now();

    public TrafficUpdate(){}
    public TrafficUpdate(Route route,TrafficSeverity severity,Integer delayMinutes,String message){
        this.route=route;this.severity=severity;this.delayMinutes=delayMinutes;this.message=message;
    }

    public Long getId(){return id;}
    public Route getRoute(){return route;}
    public TrafficSeverity getSeverity(){return severity;}
    public Integer getDelayMinutes(){return delayMinutes;}
    public String getMessage(){return message;}
    public LocalDateTime getReportedAt(){return reportedAt;}
}
