import re
from pathlib import Path
from .wiki_context import wiki_context
from .semantic_index import semantic_index

class DeepArcProcessor:
    """
    Orchestrates layered context retrieval for the chatbot.
    Arcs from the focus page to related nodes and thematic clusters.
    """

    def __init__(self, workspace_wiki_dir):
        self.wiki_dir = Path(workspace_wiki_dir)

    def get_context(self, question, page_title=None, max_tokens=4000):
        """
        Builds a multi-layered context string.
        """
        context_parts = []
        
        # --- Layer 1: Surface Arc (Directly Linked) ---
        if page_title:
            focus_content = wiki_context.get_page(page_title)
            if focus_content:
                context_parts.append(f"## FOCUS PAGE: [[{page_title}]]\n{focus_content}\n")
                
                # Outgoing links
                linked = re.findall(r"\[\[([^\]]+)\]\]", focus_content)
                for l in linked[:3]:
                    l_content = wiki_context.get_page(l)
                    if l_content:
                        context_parts.append(f"## LINKED: [[{l}]]\n{l_content[:600]}...\n")
                
                # Backlinks
                all_titles = wiki_context.get_all_page_titles()
                found_backlinks = 0
                for t in all_titles:
                    if t == page_title: continue
                    content = wiki_context.get_page(t)
                    if content and f"[[{page_title}]]" in content:
                        context_parts.append(f"## BACKLINK: [[{t}]]\n{content[:500]}...\n")
                        found_backlinks += 1
                        if found_backlinks >= 2: break

        # --- Layer 2: Relational Arc (Semantic Similarity) ---
        # Search for the question itself + page title if available
        search_query = f"{page_title} {question}" if page_title else question
        semantic_matches = semantic_index.search(search_query, top_k=5)
        
        added_sem = 0
        for title, score in semantic_matches:
            if title == page_title: continue
            # Don't add if already in context (e.g. via links)
            if any(f"[[{title}]]" in part for part in context_parts): continue
            
            content = wiki_context.get_page(title)
            if content:
                context_parts.append(f"## SEMANTICALLY RELATED: [[{title}]] (Relevance: {score:.2f})\n{content[:500]}...\n")
                added_sem += 1
                if added_sem >= 3: break

        # --- Layer 3: Structural Arc (Thematic Context) ---
        # If we have a focus page, try to find its category and related pages in that category
        if page_title:
            focus_content = wiki_context.get_page(page_title) or ""
            cat_match = re.search(r"^category:\s*(.+)$", focus_content, re.MULTILINE)
            if cat_match:
                category = cat_match.group(1).strip().strip("'").strip('"')
                context_parts.append(f"## THEME: This page belongs to the category '{category}'.\n")
                
                # Find other pages in same category
                same_cat = []
                for md_file in self.wiki_dir.glob("*.md"):
                    if md_file.stem == page_title: continue
                    content = md_file.read_text(encoding="utf-8")
                    if f"category: {category}" in content or f"category: '{category}'" in content or f'category: "{category}"' in content:
                        same_cat.append(md_file.stem)
                
                if same_cat:
                    context_parts.append(f"## RELATED BY THEME: Other pages in '{category}': {', '.join(same_cat[:5])}\n")

        # Join and truncate if needed
        full_context = "\n---\n".join(context_parts)
        return full_context

# Singleton
from django.conf import settings
deep_arc = DeepArcProcessor(settings.WORKSPACE_WIKI_DIR)
