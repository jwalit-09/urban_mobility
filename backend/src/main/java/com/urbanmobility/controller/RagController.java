package com.urbanmobility.controller;

import com.urbanmobility.service.RagService;
import com.urbanmobility.service.VectorStoreService;
import com.urbanmobility.repo.TransitDocumentRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rag")
public class RagController {

    private final RagService ragService;
    private final VectorStoreService vectorStoreService;
    private final TransitDocumentRepository docRepo;

    public RagController(RagService ragService, VectorStoreService vectorStoreService, TransitDocumentRepository docRepo) {
        this.ragService = ragService;
        this.vectorStoreService = vectorStoreService;
        this.docRepo = docRepo;
    }

    public record AskRequest(String query) {}

    @PostMapping("/ask")
    public RagService.RagResponse ask(@RequestBody AskRequest request, Authentication authentication) {
        String email = authentication != null ? authentication.getName() : "passenger@mobility.com";
        return ragService.ask(request.query(), email);
    }

    @GetMapping("/documents")
    public List<Map<String, Object>> listDocuments() {
        return docRepo.findAll().stream().map(doc -> Map.of(
                "id", (Object) doc.getId(),
                "title", doc.getTitle(),
                "category", doc.getCategory(),
                "tags", doc.getTags() != null ? doc.getTags() : "",
                "chunkCount", doc.getChunks().size()
        )).toList();
    }
}
