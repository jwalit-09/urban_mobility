package com.urbanmobility.repo;

import com.urbanmobility.model.TelemetryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TelemetryLogRepository extends JpaRepository<TelemetryLog, Long> {
    List<TelemetryLog> findTop20ByOrderByRecordedAtDesc();
    List<TelemetryLog> findByVehicleNumberOrderByRecordedAtDesc(String vehicleNumber);
    List<TelemetryLog> findByAnomalyAlertTrueOrderByRecordedAtDesc();
}
