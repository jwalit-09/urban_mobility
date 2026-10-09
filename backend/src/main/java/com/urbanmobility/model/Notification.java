package com.urbanmobility.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Notification {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional=false)
    private User user;

    @ManyToOne
    private Route route;

    @Column(nullable=false, length=500)
    private String message;

    private LocalDateTime sentAt = LocalDateTime.now();

    public Notification(){}
    public Notification(User user,Route route,String message){
        this.user=user;this.route=route;this.message=message;
    }

    public Long getId(){return id;}
    public User getUser(){return user;}
    public Route getRoute(){return route;}
    public String getMessage(){return message;}
    public LocalDateTime getSentAt(){return sentAt;}
}
