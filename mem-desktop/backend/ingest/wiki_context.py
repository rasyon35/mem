import re
from pathlib import Path
from django.conf import settings


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
    # Keyword search
    # ------------------------------------------------------------------

    def search_pages(self, query, max_pages=5):
        """Simple keyword search across all wiki .md files"""
        if not self.wiki_path.exists():
            return ""

        results = []
        for md_file in self.wiki_path.glob("*.md"):
            if md_file.name in ("index.md", "log.md"):
                continue

            content = md_file.read_text(encoding="utf-8")

            # If no query, include all pages so we always have context
            if not query or query.lower() in content.lower():
                results.append((md_file.stem, content[:1000]))

        context = ""
        for title, snippet in results[:max_pages]:
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


# Singleton – resolved path relative to workspace
wiki_context = WikiContext(
    Path(settings.BASE_DIR).parent / "workspace" / "wiki"
)
