package com.urbanmobility;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class UrbanMobilityApplication {
    public static void main(String[] args) {
        SpringApplication.run(UrbanMobilityApplication.class, args);
    }
}
