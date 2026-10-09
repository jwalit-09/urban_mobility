package com.urbanmobility.controller;

import com.urbanmobility.service.DataIngestionService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ingestion")
public class IngestionController {
    private final DataIngestionService service;
    public IngestionController(DataIngestionService service){this.service=service;}

    @PostMapping("/mobility")
    public Map<String,Object> ingest(@RequestBody Map<String,Object> input){
        return service.ingest(input);
    }
}
