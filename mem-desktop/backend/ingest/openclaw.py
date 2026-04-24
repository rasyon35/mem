import json
import re
from pathlib import Path
from datetime import datetime
from django.conf import settings
from .wiki_context import wiki_context
from .semantic_index import semantic_index
from .groq_client import groq_client
from .models import OpenClawProposal

class OpenClaw:
    """
    OpenClaw: The Reasoning & Intelligence Layer.
    Continuously analyzes the knowledge base to detect gaps, 
    redundancies, and propose structural improvements.
    """

    def __init__(self):
        self.wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"

    def run_analysis_cycle(self):
        """Run all active cognitive tasks."""
        results = []
        results.append(self.detect_redundancy())
        results.append(self.detect_gaps())
        return results

    # ------------------------------------------------------------------
    # 🧩 Redundancy Detection (Merging)
    # ------------------------------------------------------------------

    def detect_redundancy(self):
        """Finds semantically similar pages that might be duplicates."""
        titles = wiki_context.get_all_page_titles()
        proposals_created = 0
        
        seen_pairs = set()

        for title in titles:
            # Search for similar pages
            # We use a lower top_k but high score threshold later
            matches = semantic_index.search(title, top_k=5)
            
            for match_title, score in matches:
                if match_title == title:
                    continue
                
                # Avoid processing the same pair twice
                pair = tuple(sorted([title, match_title]))
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)

                # If similarity is very high, investigate further
                if score > 0.85:
                    if self._check_should_merge(title, match_title):
                        self._create_merge_proposal(title, match_title)
                        proposals_created += 1

        return f"Redundancy scan complete. Found {proposals_created} potential merges."

    def _check_should_merge(self, title_a, title_b):
        """Ask LLM if two pages are redundant and should be merged."""
        content_a = wiki_context.get_page(title_a)
        content_b = wiki_context.get_page(title_b)
        
        prompt = f"""You are analyzing two wiki pages for redundancy.
Page A: [[{title_a}]]
Content A: {content_a[:1000]}

Page B: [[{title_b}]]
Content B: {content_b[:1000]}

Should these two pages be merged into a single concept? 
If they represent the exact same entity or idea with minor differences, answer YES.
If they are distinct but related concepts, answer NO.

Answer with ONLY 'YES' or 'NO' followed by a one-sentence rationale.
Format: [YES/NO] | [Rationale]"""

        try:
            response = groq_client.client.chat.completions.create(
                model=groq_client.model,
                messages=[
                    {"role": "system", "content": "You are a knowledge architect. Your goal is to keep the knowledge base lean and well-structured."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=100,
            )
            res_text = response.choices[0].message.content.strip()
            return res_text.startswith("YES")
        except Exception as e:
            print(f"Error checking merge for {title_a} and {title_b}: {e}")
            return False

    def _create_merge_proposal(self, title_a, title_b):
        """Generate a proposed merged version of two pages and store it."""
        content_a = wiki_context.get_page(title_a)
        content_b = wiki_context.get_page(title_b)
        
        # Check if proposal already exists
        if OpenClawProposal.objects.filter(
            proposal_type="merge", 
            title=f"Merge {title_a} and {title_b}",
            status="pending"
        ).exists():
            return

        prompt = f"""Merge the following two wiki pages into a single, comprehensive page.
Preserve all unique information from both. Ensure links and formatting are maintained.

Page A: [[{title_a}]]
{content_a}

Page B: [[{title_b}]]
{content_b}

Generate the final merged markdown content. 
Include the frontmatter with a unified category.
The title of the merged page should be the most appropriate of the two or a better combined title.

Return ONLY the new markdown content."""

        try:
            response = groq_client.client.chat.completions.create(
                model=groq_client.model,
                messages=[
                    {"role": "system", "content": "You are a knowledge architect. Merge these pages seamlessly."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=2048,
            )
            merged_content = response.choices[0].message.content.strip()
            
            # Save proposal
            OpenClawProposal.objects.create(
                proposal_type="merge",
                title=f"Merge {title_a} and {title_b}",
                description=f"OpenClaw detected high semantic overlap ({title_a} vs {title_b}).",
                data={
                    "page_a": title_a,
                    "page_b": title_b,
                    "proposed_content": merged_content
                }
            )
        except Exception as e:
            print(f"Error generating merge for {title_a} and {title_b}: {e}")

    # ------------------------------------------------------------------
    # 🔍 Gap Detection (Missing Pages)
    # ------------------------------------------------------------------

    def detect_gaps(self):
        """Finds internal links to pages that don't exist yet."""
        titles = wiki_context.get_all_page_titles()
        missing_pages = {} # {title: [linked_from_page]}
        
        for title in titles:
            content = wiki_context.get_page(title)
            if not content: continue
            
            links = re.findall(r"\[\[([^\]]+)\]\]", content)
            for link in links:
                if not wiki_context.page_exists(link):
                    missing_pages.setdefault(link, []).append(title)
        
        proposals_created = 0
        for missing_title, linked_from in missing_pages.items():
            # If a page is linked 2+ times, it's a strong candidate for creation
            if len(linked_from) >= 1:
                self._create_gap_proposal(missing_title, linked_from)
                proposals_created += 1
                
        return f"Gap detection complete. Found {proposals_created} missing pages."

    def _create_gap_proposal(self, title, linked_from):
        """Propose creating a new page for a frequently mentioned concept."""
        if OpenClawProposal.objects.filter(
            proposal_type="gap", 
            title=title,
            status="pending"
        ).exists():
            return

        # Get context from the linking pages to generate initial content
        context = ""
        for source_page in linked_from[:3]:
            source_content = wiki_context.get_page(source_page)
            # Find context around the link
            match = re.search(f".{{0,200}}\\[\\[{re.escape(title)}\\]\\].{{0,200}}", source_content, re.DOTALL)
            if match:
                context += f"From [[{source_page}]]: ...{match.group(0)}...\n"

        prompt = f"""Generate an initial wiki page for the concept: [[{title}]]
This page is currently missing but is referenced in the following contexts:
{context}

Generate a concise, helpful initial page in markdown format.
Include frontmatter (title, category).
Return ONLY the markdown."""

        try:
            response = groq_client.client.chat.completions.create(
                model=groq_client.model,
                messages=[
                    {"role": "system", "content": "You are a knowledge architect creating a new entry based on surrounding context."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                max_tokens=1000,
            )
            proposed_content = response.choices[0].message.content.strip()
            
            OpenClawProposal.objects.create(
                proposal_type="gap",
                title=title,
                description=f"Concept mentioned in {', '.join(linked_from)} but page does not exist.",
                data={
                    "proposed_content": proposed_content,
                    "referenced_by": linked_from
                }
            )
        except Exception as e:
            print(f"Error generating gap proposal for {title}: {e}")

# Singleton
open_claw = OpenClaw()
