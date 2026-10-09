package com.urbanmobility.repo;
import com.urbanmobility.model.TrafficUpdate;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TrafficRepository extends JpaRepository<TrafficUpdate,Long>{}
