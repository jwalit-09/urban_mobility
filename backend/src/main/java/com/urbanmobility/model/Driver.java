package com.urbanmobility.model;

import jakarta.persistence.*;

@Entity
public class Driver {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false)
    private String name;

    private String licenseNumber;
    private String phone;

    public Driver() {}
    public Driver(String name, String licenseNumber, String phone) {
        this.name = name; this.licenseNumber = licenseNumber; this.phone = phone;
    }

    public Long getId(){return id;}
    public String getName(){return name;}
    public String getLicenseNumber(){return licenseNumber;}
    public String getPhone(){return phone;}
    public void setId(Long id){this.id=id;}
    public void setName(String name){this.name=name;}
    public void setLicenseNumber(String v){this.licenseNumber=v;}
    public void setPhone(String v){this.phone=v;}
}
