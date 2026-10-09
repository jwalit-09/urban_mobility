package com.urbanmobility.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "telemetry_logs")
public class TelemetryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String vehicleNumber;

    private Long routeId;
    private Double latitude;
    private Double longitude;
    private Double speedKmh;
    private Integer batteryOrFuelPct;
    private Integer passengerCount;
    private Boolean anomalyAlert = false;
    private String anomalyDescription;

    private LocalDateTime recordedAt = LocalDateTime.now();

    public TelemetryLog() {}

    public TelemetryLog(String vehicleNumber, Long routeId, Double latitude, Double longitude,
                        Double speedKmh, Integer batteryOrFuelPct, Integer passengerCount,
                        Boolean anomalyAlert, String anomalyDescription) {
        this.vehicleNumber = vehicleNumber;
        this.routeId = routeId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.speedKmh = speedKmh;
        this.batteryOrFuelPct = batteryOrFuelPct;
        this.passengerCount = passengerCount;
        this.anomalyAlert = anomalyAlert;
        this.anomalyDescription = anomalyDescription;
        this.recordedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getVehicleNumber() { return vehicleNumber; }
    public Long getRouteId() { return routeId; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public Double getSpeedKmh() { return speedKmh; }
    public Integer getBatteryOrFuelPct() { return batteryOrFuelPct; }
    public Integer getPassengerCount() { return passengerCount; }
    public Boolean getAnomalyAlert() { return anomalyAlert; }
    public String getAnomalyDescription() { return anomalyDescription; }
    public LocalDateTime getRecordedAt() { return recordedAt; }

    public void setId(Long id) { this.id = id; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
    public void setRouteId(Long routeId) { this.routeId = routeId; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public void setSpeedKmh(Double speedKmh) { this.speedKmh = speedKmh; }
    public void setBatteryOrFuelPct(Integer batteryOrFuelPct) { this.batteryOrFuelPct = batteryOrFuelPct; }
    public void setPassengerCount(Integer passengerCount) { this.passengerCount = passengerCount; }
    public void setAnomalyAlert(Boolean anomalyAlert) { this.anomalyAlert = anomalyAlert; }
    public void setAnomalyDescription(String anomalyDescription) { this.anomalyDescription = anomalyDescription; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }
}
