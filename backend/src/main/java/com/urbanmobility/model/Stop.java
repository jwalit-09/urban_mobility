package com.urbanmobility.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
public class Stop {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false)
    private String name;

    @Column(nullable=false)
    private Integer sequenceNo;

    @JsonIgnore
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="route_id")
    private Route route;

    public Stop(){}
    public Stop(String name,Integer sequenceNo,Route route){
        this.name=name;this.sequenceNo=sequenceNo;this.route=route;
    }

    public Long getId(){return id;}
    public String getName(){return name;}
    public Integer getSequenceNo(){return sequenceNo;}
    public Route getRoute(){return route;}
    public void setId(Long id){this.id=id;}
    public void setName(String v){this.name=v;}
    public void setSequenceNo(Integer v){this.sequenceNo=v;}
    public void setRoute(Route v){this.route=v;}
}
