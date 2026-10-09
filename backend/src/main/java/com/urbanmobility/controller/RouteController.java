package com.urbanmobility.controller;

import com.urbanmobility.model.*;
import com.urbanmobility.repo.RouteRepository;
import com.urbanmobility.service.RouteEngine;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/routes")
public class RouteController {
    private final RouteRepository routes;
    private final RouteEngine engine;

    public RouteController(RouteRepository routes,RouteEngine engine){
        this.routes=routes;this.engine=engine;
    }

    @GetMapping
    public List<Route> all(){return routes.findAll();}

    public record RouteRequest(String name,String source,String destination,Double distanceKm,Integer baseMinutes,List<String> stops){}

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Route create(@RequestBody RouteRequest r){
        Route route=new Route(r.name(),r.source(),r.destination(),r.distanceKm(),r.baseMinutes());
        if(r.stops()!=null){
            for(int i=0;i<r.stops().size();i++) route.getStops().add(new Stop(r.stops().get(i),i+1,route));
        }
        return routes.save(route);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Route update(@PathVariable Long id,@RequestBody RouteRequest r){
        Route route=routes.findById(id).orElseThrow(()->new IllegalArgumentException("Route not found"));
        route.setName(r.name());route.setSource(r.source());route.setDestination(r.destination());
        route.setDistanceKm(r.distanceKm());route.setBaseMinutes(r.baseMinutes());
        route.getStops().clear();
        if(r.stops()!=null) for(int i=0;i<r.stops().size();i++) route.getStops().add(new Stop(r.stops().get(i),i+1,route));
        return routes.save(route);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String,String> delete(@PathVariable Long id){
        routes.deleteById(id);return Map.of("message","Route deleted");
    }

    public record CalcRequest(String source,String destination){}

    @PostMapping("/calculate")
    public Map<String,Object> calculate(@RequestBody CalcRequest r){
        return engine.calculate(routes.findAll(),r.source(),r.destination());
    }
}
