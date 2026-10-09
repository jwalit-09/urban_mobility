package com.urbanmobility.service;

import com.urbanmobility.model.*;
import com.urbanmobility.repo.RouteRepository;
import com.urbanmobility.repo.TrafficRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class DataIngestionService {
    private final RouteRepository routeRepository;
    private final TrafficRepository trafficRepository;

    public DataIngestionService(RouteRepository routeRepository,TrafficRepository trafficRepository){
        this.routeRepository=routeRepository;this.trafficRepository=trafficRepository;
    }

    public Map<String,Object> ingest(Map<String,Object> input){
        String type=Objects.toString(input.get("type"),"UNKNOWN").trim().toUpperCase();
        if(type.isBlank()||type.equals("UNKNOWN")) throw new IllegalArgumentException("type is required");

        Map<String,Object> cleaned=new LinkedHashMap<>();
        cleaned.put("type",type);

        Object value=input.get("value");
        if(value==null) throw new IllegalArgumentException("value is required");
        cleaned.put("value",value);

        if(input.containsKey("latitude")) cleaned.put("latitude",input.get("latitude"));
        if(input.containsKey("longitude")) cleaned.put("longitude",input.get("longitude"));
        if(input.containsKey("routeId")) cleaned.put("routeId",input.get("routeId"));

        return Map.of(
                "status","PROCESSED",
                "message","Mobility input validated and normalized",
                "processedData",cleaned
        );
    }
}
