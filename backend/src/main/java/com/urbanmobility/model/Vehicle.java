package com.urbanmobility.model;

import jakarta.persistence.*;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String vehicleNumber;

    private String type;
    private Integer capacity;

    private String fuelType = "DIESEL"; // ELECTRIC, HYBRID, CNG, DIESEL
    private String operationalStatus = "ACTIVE"; // ACTIVE, IN_DEPOT, MAINTENANCE

    private Double currentLatitude = 17.3850;
    private Double currentLongitude = 78.4867;
    private Double speedKmh = 35.0;
    private Integer batteryOrFuelPct = 85;

    @ManyToOne
    private Driver driver;

    @ManyToOne
    private Route currentRoute;

    public Vehicle() {}

    public Vehicle(String vehicleNumber, String type, Integer capacity, Driver driver) {
        this.vehicleNumber = vehicleNumber;
        this.type = type;
        this.capacity = capacity;
        this.driver = driver;
        this.fuelType = type != null && type.toLowerCase().contains("electric") ? "ELECTRIC" : "DIESEL";
    }

    public Vehicle(String vehicleNumber, String type, Integer capacity, String fuelType, Driver driver, Route currentRoute) {
        this.vehicleNumber = vehicleNumber;
        this.type = type;
        this.capacity = capacity;
        this.fuelType = fuelType;
        this.driver = driver;
        this.currentRoute = currentRoute;
        this.operationalStatus = "ACTIVE";
    }

    public Long getId() { return id; }
    public String getVehicleNumber() { return vehicleNumber; }
    public String getType() { return type; }
    public Integer getCapacity() { return capacity; }
    public String getFuelType() { return fuelType; }
    public String getOperationalStatus() { return operationalStatus; }
    public Double getCurrentLatitude() { return currentLatitude; }
    public Double getCurrentLongitude() { return currentLongitude; }
    public Double getSpeedKmh() { return speedKmh; }
    public Integer getBatteryOrFuelPct() { return batteryOrFuelPct; }
    public Driver getDriver() { return driver; }
    public Route getCurrentRoute() { return currentRoute; }

    public void setId(Long id) { this.id = id; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
    public void setType(String type) { this.type = type; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }
    public void setOperationalStatus(String operationalStatus) { this.operationalStatus = operationalStatus; }
    public void setCurrentLatitude(Double currentLatitude) { this.currentLatitude = currentLatitude; }
    public void setCurrentLongitude(Double currentLongitude) { this.currentLongitude = currentLongitude; }
    public void setSpeedKmh(Double speedKmh) { this.speedKmh = speedKmh; }
    public void setBatteryOrFuelPct(Integer batteryOrFuelPct) { this.batteryOrFuelPct = batteryOrFuelPct; }
    public void setDriver(Driver driver) { this.driver = driver; }
    public void setCurrentRoute(Route currentRoute) { this.currentRoute = currentRoute; }
}
