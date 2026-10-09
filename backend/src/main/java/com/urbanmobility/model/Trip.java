package com.urbanmobility.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Trip {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional=false)
    private User user;

    @ManyToOne(optional=false)
    private Route route;

    private LocalDateTime bookedAt = LocalDateTime.now();

    public Trip(){}
    public Trip(User user,Route route){this.user=user;this.route=route;}

    public Long getId(){return id;}
    public User getUser(){return user;}
    public Route getRoute(){return route;}
    public LocalDateTime getBookedAt(){return bookedAt;}
    public void setId(Long id){this.id=id;}
    public void setUser(User v){this.user=v;}
    public void setRoute(Route v){this.route=v;}
}
