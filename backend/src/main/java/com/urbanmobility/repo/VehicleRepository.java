package com.urbanmobility.repo;
import com.urbanmobility.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
public interface VehicleRepository extends JpaRepository<Vehicle,Long>{}
