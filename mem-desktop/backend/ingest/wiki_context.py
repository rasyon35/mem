import re
from pathlib import Path
from django.conf import settings
from .semantic_index import semantic_index



class WikiContext:
    """Retrieves relevant existing wiki pages to feed as context during ingestion"""

    def __init__(self, wiki_path):
        self.wiki_path = Path(wiki_path)

    # ------------------------------------------------------------------
    # Index
    # ------------------------------------------------------------------

    def get_index(self):
        """Read the index.md file if it exists"""
        index_file = self.wiki_path / "index.md"
        if index_file.exists():
            return index_file.read_text(encoding="utf-8")
        return "# Wiki Index\n\nNo pages yet."

    # ------------------------------------------------------------------
    # Hybrid search (Keyword + Semantic)
    # ------------------------------------------------------------------

    def search_pages(self, query, max_pages=8):
        """
        Retrieves relevant wiki pages using a hybrid approach:
        1. Semantic Search (Conceptual similarity)
        2. Keyword Search (Literal presence)
        """
        if not self.wiki_path.exists() or not query:
            return ""

        # Score containers {title: total_score}
        scores = {}

        # 1. Semantic Search (Weight: 2.0)
        semantic_results = semantic_index.search(query, top_k=max_pages)
        for title, score in semantic_results:
            scores[title] = scores.get(title, 0) + (score * 2.0)

        # 2. Keyword Search (Weight: 1.0 per keyword match)
        keywords = set(re.findall(r"\w+", query.lower()))
        if keywords:
            for md_file in self.wiki_path.glob("*.md"):
                if md_file.name in ("index.md", "log.md") or md_file.name.startswith("."):
                    continue

                content = md_file.read_text(encoding="utf-8").lower()
                title = md_file.stem
                
                kw_score = 0
                for kw in keywords:
                    if kw in content:
                        kw_score += 1
                
                if kw_score > 0:
                    scores[title] = scores.get(title, 0) + kw_score

        if not scores:
            return ""

        # Sort combined results
        sorted_titles = sorted(scores.keys(), key=lambda t: scores[t], reverse=True)
        
        context = ""
        for title in sorted_titles[:max_pages]:
            content = self.get_page(title)
            if content:
                snippet = content[:500]
                context += f"\n## [[{title}]]\n{snippet}\n---\n"
        
        return context


    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def get_all_page_titles(self):
        """Return list of all wiki page titles (excluding index/log)"""
        if not self.wiki_path.exists():
            return []
        return [
            f.stem
            for f in self.wiki_path.glob("*.md")
            if f.stem not in ("index", "log")
        ]

    def page_exists(self, title):
        slug = title.replace(" ", "_")
        return (self.wiki_path / f"{slug}.md").exists()

    def get_page(self, title):
        slug = title.replace(" ", "_")
        path = self.wiki_path / f"{slug}.md"
        if path.exists():
            return path.read_text(encoding="utf-8")
        return None

    def get_suggested_links(self, title, top_k=5):
        """
        Suggests related pages using semantic similarity.
        Excludes pages already linked in the content.
        """
        content = self.get_page(title)
        if not content:
            return []

        # 1. Get semantic matches
        # We query using the title + snippet for more context
        query = f"{title}\n{content[:500]}"
        results = semantic_index.search(query, top_k=top_k + 5) # Get extra for filtering

        # 2. Extract existing links
        existing_links = set(re.findall(r"\[\[([^\]]+)\]\]", content))
        existing_slugs = {l.replace(" ", "_") for l in existing_links}
        current_slug = title.replace(" ", "_")

        suggestions = []
        for match_title, score in results:
            match_slug = match_title.replace(" ", "_")
            
            # Filter criteria:
            # - Not the current page
            # - Not already linked
            # - High enough score (> 0.4)
            if match_slug == current_slug: continue
            if match_slug in existing_slugs: continue
            if score < 0.4: continue

            suggestions.append({
                "title": match_title,
                "score": round(float(score), 4)
            })

        return suggestions[:top_k]


# Singleton – resolved path relative to workspace
wiki_context = WikiContext(
    Path(settings.BASE_DIR).parent / "workspace" / "wiki"
)
