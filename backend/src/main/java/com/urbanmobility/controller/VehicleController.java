package com.urbanmobility.controller;

import com.urbanmobility.model.*;
import com.urbanmobility.repo.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {
    private final VehicleRepository vehicles;
    private final DriverRepository drivers;

    public VehicleController(VehicleRepository vehicles,DriverRepository drivers){
        this.vehicles=vehicles;this.drivers=drivers;
    }

    @GetMapping
    public List<Vehicle> all(){return vehicles.findAll();}

    public record VehicleRequest(String vehicleNumber,String type,Integer capacity,Long driverId){}

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Vehicle create(@RequestBody VehicleRequest r){
        Driver d=r.driverId()==null?null:drivers.findById(r.driverId()).orElseThrow();
        return vehicles.save(new Vehicle(r.vehicleNumber(),r.type(),r.capacity(),d));
    }
}
