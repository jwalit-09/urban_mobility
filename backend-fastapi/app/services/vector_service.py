import math
import hashlib
from typing import List

class VectorEmbeddingService:
    """
    Vector Database Engine: Generates dense 128-dimensional vector embeddings
    and computes geometric similarity metrics (Cosine, L2/Euclidean, Dot Product).
    """
    DIMENSIONS = 128

    def embed_text(self, text: str) -> List[float]:
        """
        Embeds arbitrary text into a normalized 128-dimensional vector space
        using feature hashing with subword n-gram projections.
        """
        vec = [0.0] * self.DIMENSIONS
        tokens = text.lower().split()
        if not tokens:
            return vec

        for token in tokens:
            # Word hashing
            h = int(hashlib.sha256(token.encode('utf-8')).hexdigest(), 16)
            idx = h % self.DIMENSIONS
            sign = 1.0 if ((h >> 8) & 1) else -1.0
            vec[idx] += sign

            # Character 3-gram hashing for subword semantics
            for i in range(max(1, len(token) - 2)):
                tri = token[i:i+3]
                h_tri = int(hashlib.md5(tri.encode('utf-8')).hexdigest(), 16)
                idx_tri = h_tri % self.DIMENSIONS
                vec[idx_tri] += 0.5 * (1.0 if ((h_tri >> 4) & 1) else -1.0)

        # L2-Norm vector normalization
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 1e-9:
            vec = [x / norm for x in vec]
        return vec

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Computes Cosine Similarity: dot(A, B) / (norm(A) * norm(B))."""
        if len(vec_a) != len(vec_b) or not vec_a:
            return 0.0
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return max(0.0, min(1.0, (dot / (norm_a * norm_b) + 1.0) / 2.0))

    @staticmethod
    def euclidean_distance(vec_a: List[float], vec_b: List[float]) -> float:
        """Computes Euclidean / L2 Distance: sqrt(sum((a - b)^2))."""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(vec_a, vec_b)))

    @staticmethod
    def dot_product(vec_a: List[float], vec_b: List[float]) -> float:
        """Computes Inner / Dot Product."""
        return sum(a * b for a, b in zip(vec_a, vec_b))

vector_service = VectorEmbeddingService()
