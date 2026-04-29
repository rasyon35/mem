import os
import time
from pathlib import Path
from django.conf import settings

try:
    from sentence_transformers import SentenceTransformer
    import chromadb
except ImportError:
    SentenceTransformer = None
    chromadb = None


class SemanticIndex:
    """Handles vector embedding generation, storage, and search for wiki pages using ChromaDB."""

    def __init__(self):
        self.wiki_dir = Path(settings.WORKSPACE_WIKI_DIR)
        self.index_dir = Path(settings.WORKSPACE_INDEX_DIR)
        
        self.index_dir.mkdir(parents=True, exist_ok=True)

        self.model_name = 'all-MiniLM-L6-v2'
        self._model = None
        self.query_cache = {}

        if chromadb is not None:
            self.db_client = chromadb.PersistentClient(path=str(self.index_dir))
            # Create or get collection using cosine similarity
            self.collection = self.db_client.get_or_create_collection(
                name="wiki_knowledge",
                metadata={"hnsw:space": "cosine"}
            )
        else:
            self.db_client = None
            self.collection = None

    @property
    def model(self):
        if self._model is None:
            if SentenceTransformer is None:
                raise ImportError("sentence-transformers not installed. Run pip install sentence-transformers chromadb.")
            print(f"Loading embedding model: {self.model_name}...")
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def _chunk_text(self, text, chunk_size=1000, overlap=200):
        """Splits text into overlapping chunks."""
        chunks = []
        start = 0
        text_len = len(text)
        while start < text_len:
            end = start + chunk_size
            chunks.append(text[start:end])
            if end >= text_len:
                break
            start += chunk_size - overlap
        return chunks

    def _embed_and_store_page(self, md_file, title, mtime):
        """Generates embeddings for chunks and stores them in ChromaDB."""
        content = md_file.read_text(encoding="utf-8")
        
        # Remove frontmatter if present
        main_text = content
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                main_text = parts[2]
                
        chunks = self._chunk_text(main_text)
        if not chunks:
            chunks = [""] # Empty page handling
            
        texts_to_embed = [f"Title: {title.replace('_', ' ')}\nContent: {chunk}" for chunk in chunks]
        
        # Generate embeddings as lists of floats
        embeddings = self.model.encode(texts_to_embed, show_progress_bar=False).tolist()
        
        # Prepare data for ChromaDB
        ids = [f"{title}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"title": title, "mtime": mtime, "model": self.model_name, "chunk_idx": i} for i in range(len(chunks))]
        
        # Remove any existing chunks for this title to avoid duplicates on update
        self.collection.delete(where={"title": title})
        
        # Add new chunks
        self.collection.add(
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )

    def index_all(self, force=False):
        """
        Incrementally builds or updates the ChromaDB index.
        """
        if not self.wiki_dir.exists() or self.collection is None:
            return False

        all_files = sorted(list(self.wiki_dir.glob("*.md")))
        valid_titles = set()

        for md_file in all_files:
            if md_file.name in ("index.md", "log.md") or md_file.name.startswith("."):
                continue
                
            title = md_file.stem
            valid_titles.add(title)
            
            mtime = os.path.getmtime(md_file)
            
            needs_update = True
            if not force:
                # Check if we already have this title with the same timestamp
                existing = self.collection.get(
                    where={"title": title},
                    limit=1,
                    include=["metadatas"]
                )
                if existing and existing["metadatas"]:
                    meta = existing["metadatas"][0]
                    if meta.get("mtime") == mtime and meta.get("model") == self.model_name:
                        needs_update = False
                        
            if needs_update:
                print(f"Indexing page: {title} to ChromaDB...")
                self._embed_and_store_page(md_file, title, mtime)

        # Cleanup deleted files
        # Fetch all existing metadata titles
        all_existing = self.collection.get(include=["metadatas"])
        if all_existing and all_existing["metadatas"]:
            existing_titles = set(meta["title"] for meta in all_existing["metadatas"])
            for t in existing_titles:
                if t not in valid_titles:
                    print(f"Removing deleted page from ChromaDB index: {t}")
                    self.collection.delete(where={"title": t})
            
        return True

    def search(self, query, top_k=5):
        """
        Performs semantic search using ChromaDB.
        Returns a list of (title, score) tuples (deduplicated by title).
        """
        if self.collection is None:
            return []

        # Cache query embeddings for speed
        if query in self.query_cache:
            query_vec = self.query_cache[query]
        else:
            query_vec = self.model.encode([query]).tolist()[0]
            self.query_cache[query] = query_vec
            if len(self.query_cache) > 1000:
                self.query_cache.pop(next(iter(self.query_cache)))

        # Query ChromaDB (returns distances, for cosine space it's 1 - cosine_similarity)
        results = self.collection.query(
            query_embeddings=[query_vec],
            n_results=top_k * 3, # Fetch extra to account for deduplication
            include=["metadatas", "distances"]
        )
        
        if not results["metadatas"] or not results["metadatas"][0]:
            return []
            
        metadatas = results["metadatas"][0]
        distances = results["distances"][0]
        
        final_results = []
        seen_titles = set()
        
        for meta, dist in zip(metadatas, distances):
            score = 1.0 - dist # Convert distance back to similarity score
            
            if score < 0.3: # Minimum threshold
                break
                
            title = meta["title"]
            if title not in seen_titles:
                final_results.append((title, score))
                seen_titles.add(title)
                
            if len(final_results) >= top_k:
                break
                
        return final_results


# Singleton instance
semantic_index = SemanticIndex()

