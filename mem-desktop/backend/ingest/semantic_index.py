import os
import json
import numpy as np
from pathlib import Path
from django.conf import settings

try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    SentenceTransformer = None
    cosine_similarity = None


class SemanticIndex:
    """Handles vector embedding generation, storage, and search for wiki pages."""

    def __init__(self):
        self.wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
        self.index_dir = Path(settings.BASE_DIR).parent / "workspace" / "_index"
        self.index_dir.mkdir(parents=True, exist_ok=True)

        self.embeddings_path = self.index_dir / "embeddings.npy"
        self.map_path = self.index_dir / "map.json"

        # Model is loaded lazily to save memory during simple indexing tasks
        self._model = None
        self.model_name = 'all-MiniLM-L6-v2'

        # Cached index data
        self.embeddings = None  # Numpy array
        self.id_to_title = []   # List of titles corresponding to embedding rows

        self.load_index()

    @property
    def model(self):
        if self._model is None:
            if SentenceTransformer is None:
                raise ImportError("sentence-transformers not installed. Run pip install sentence-transformers.")
            print(f"Loading embedding model: {self.model_name}...")
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def load_index(self):
        """Loads embeddings and mapping from disk."""
        if self.embeddings_path.exists() and self.map_path.exists():
            try:
                self.embeddings = np.load(str(self.embeddings_path))
                with open(self.map_path, 'r') as f:
                    self.id_to_title = json.load(f)
            except Exception as e:
                print(f"Error loading semantic index: {e}")
                self.embeddings = None
                self.id_to_title = []

    def save_index(self):
        """Saves current embeddings and mapping to disk."""
        if self.embeddings is not None:
            np.save(str(self.embeddings_path), self.embeddings)
            with open(self.map_path, 'w') as f:
                json.dump(self.id_to_title, f)

    def index_all(self, force=False):
        """
        Scans all wiki markdown files and builds/updates the embedding index.
        """
        if not self.wiki_dir.exists():
            return False

        all_files = sorted(list(self.wiki_dir.glob("*.md")))
        texts = []
        titles = []

        for md_file in all_files:
            if md_file.name in ("index.md", "log.md") or md_file.name.startswith("."):
                continue

            # We index the title + first 2000 chars of content
            content = md_file.read_text(encoding="utf-8")
            title = md_file.stem
            
            # Clean content slightly for better embeddings (remove frontmatter)
            main_text = content
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    main_text = parts[2]
            
            # Indexing both title and content snippet helps for retrieval
            texts.append(f"Title: {title.replace('_', ' ')}\nContent: {main_text[:2000]}")
            titles.append(title)

        if not texts:
            return False

        print(f"Indexing {len(texts)} pages...")
        new_embeddings = self.model.encode(texts, show_progress_bar=True)
        
        self.embeddings = np.array(new_embeddings)
        self.id_to_title = titles
        self.save_index()
        return True

    def search(self, query, top_k=5):
        """
        Performs semantic search for a query string.
        Returns a list of (title, score) tuples.
        """
        if self.embeddings is None or not self.id_to_title:
            return []

        if cosine_similarity is None:
            return []

        # Encode query
        query_vec = self.model.encode([query])
        
        # Calculate similarity
        # embeddings: [N, D], query_vec: [1, D]
        # result: [1, N]
        sims = cosine_similarity(query_vec, self.embeddings)[0]
        
        # Get top K indices
        top_indices = sims.argsort()[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            score = float(sims[idx])
            if score > 0.3: # Minimum threshold to avoid noise
                results.append((self.id_to_title[idx], score))
        
        return results


# Singleton instance
semantic_index = SemanticIndex()
