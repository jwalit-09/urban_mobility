package com.urbanmobility.controller;

import com.urbanmobility.model.*;
import com.urbanmobility.repo.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/traffic")
public class TrafficController {
    private final TrafficRepository traffic;
    private final RouteRepository routes;

    public TrafficController(TrafficRepository traffic,RouteRepository routes){
        this.traffic=traffic;this.routes=routes;
    }

    @GetMapping
    public List<TrafficUpdate> all(){return traffic.findAll();}

    public record TrafficRequest(Long routeId,TrafficSeverity severity,Integer delayMinutes,String message){}

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public TrafficUpdate create(@RequestBody TrafficRequest r){
        Route route=routes.findById(r.routeId()).orElseThrow();
        return traffic.save(new TrafficUpdate(route,r.severity(),r.delayMinutes(),r.message()));
    }
}
