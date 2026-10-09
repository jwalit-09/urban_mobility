package com.urbanmobility.model;

import jakarta.persistence.*;
import java.util.*;

@Entity
@Table(name="routes")
public class Route {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false)
    private String name;

    @Column(nullable=false)
    private String source;

    @Column(nullable=false)
    private String destination;

    private Double distanceKm;
    private Integer baseMinutes;

    private Double baseFare = 20.0; // in local currency (e.g. INR / USD)
    private Double co2GramsPerKm = 65.0; // g CO2/km (e.g., 0 for electric, 40 for metro, 85 for diesel bus)
    private String transitMode = "BUS"; // BUS, ELECTRIC_BUS, METRO, EXPRESS

    @OneToMany(mappedBy="route", cascade=CascadeType.ALL, orphanRemoval=true)
    @OrderBy("sequenceNo ASC")
    private List<Stop> stops = new ArrayList<>();

    public Route() {}

    public Route(String name, String source, String destination, Double distanceKm, Integer baseMinutes){
        this.name = name;
        this.source = source;
        this.destination = destination;
        this.distanceKm = distanceKm;
        this.baseMinutes = baseMinutes;
        this.baseFare = Math.round((distanceKm != null ? distanceKm * 2.5 + 10 : 20.0) * 10.0) / 10.0;
        this.co2GramsPerKm = 65.0;
        this.transitMode = "BUS";
    }

    public Route(String name, String source, String destination, Double distanceKm, Integer baseMinutes,
                 Double baseFare, Double co2GramsPerKm, String transitMode) {
        this.name = name;
        this.source = source;
        this.destination = destination;
        this.distanceKm = distanceKm;
        this.baseMinutes = baseMinutes;
        this.baseFare = baseFare;
        this.co2GramsPerKm = co2GramsPerKm;
        this.transitMode = transitMode;
    }

    public Long getId(){ return id; }
    public String getName(){ return name; }
    public String getSource(){ return source; }
    public String getDestination(){ return destination; }
    public Double getDistanceKm(){ return distanceKm; }
    public Integer getBaseMinutes(){ return baseMinutes; }
    public Double getBaseFare(){ return baseFare; }
    public Double getCo2GramsPerKm(){ return co2GramsPerKm; }
    public String getTransitMode(){ return transitMode; }
    public List<Stop> getStops(){ return stops; }

    public void setId(Long id){ this.id = id; }
    public void setName(String v){ this.name = v; }
    public void setSource(String v){ this.source = v; }
    public void setDestination(String v){ this.destination = v; }
    public void setDistanceKm(Double v){ this.distanceKm = v; }
    public void setBaseMinutes(Integer v){ this.baseMinutes = v; }
    public void setBaseFare(Double v){ this.baseFare = v; }
    public void setCo2GramsPerKm(Double v){ this.co2GramsPerKm = v; }
    public void setTransitMode(String v){ this.transitMode = v; }
    public void setStops(List<Stop> v){ this.stops = v; }
}
