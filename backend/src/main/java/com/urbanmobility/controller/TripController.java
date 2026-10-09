package com.urbanmobility.controller;

import com.urbanmobility.model.*;
import com.urbanmobility.repo.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/trips")
public class TripController {
    private final UserRepository users;
    private final RouteRepository routes;
    private final TripRepository trips;

    public TripController(UserRepository users,RouteRepository routes,TripRepository trips){
        this.users=users;this.routes=routes;this.trips=trips;
    }

    public record TripRequest(Long routeId){}

    @PostMapping
    public Trip create(@RequestBody TripRequest r, Authentication auth){
        User u=users.findByEmail(auth.getName()).orElseThrow();
        Route route=routes.findById(r.routeId()).orElseThrow();
        return trips.save(new Trip(u,route));
    }

    @GetMapping("/mine")
    public Object mine(Authentication auth){
        return trips.findAll().stream()
                .filter(t->t.getUser().getEmail().equals(auth.getName()))
                .toList();
    }
}
