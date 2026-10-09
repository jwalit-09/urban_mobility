package com.urbanmobility.repo;
import com.urbanmobility.model.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TripRepository extends JpaRepository<Trip,Long>{}
