package com.urbanmobility.repo;

import com.urbanmobility.model.TransitDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransitDocumentRepository extends JpaRepository<TransitDocument, Long> {
    List<TransitDocument> findByCategory(String category);
    boolean existsByTitle(String title);
}
