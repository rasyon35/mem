import json
from groq import Groq
from django.conf import settings


class GroqClient:
    """Wrapper for Groq API with Mem-specific prompts"""

    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL

    # ------------------------------------------------------------------
    # Ingestion
    # ------------------------------------------------------------------

    def generate_wiki_updates(self, text, source_name, existing_wiki_context="", existing_categories="", source_type="text"):
        """
        Send extracted text to Groq in chunks and get structured wiki updates.
        """
        chunks = self._split_text(text)
        merged_result = {
            "new_pages": [],
            "updated_pages": [],
            "contradictions": [],
            "summary": "",
        }

        for i, chunk in enumerate(chunks):
            print(f"Processing chunk {i+1}/{len(chunks)} for {source_name}...")
            
            # Format current staged progress as context for the next chunk
            staged_context = ""
            if merged_result["new_pages"] or merged_result["updated_pages"]:
                staged_context = "STAGED CHANGES SO FAR (from previous parts of this document):\n"
                for p in merged_result["new_pages"]:
                    staged_context += f"- [NEW] {p['title']}\n"
                for p in merged_result["updated_pages"]:
                    staged_context += f"- [UPDATE] {p['title']}\n"

            prompt = self._build_ingest_prompt(
                chunk, 
                f"{source_name} (Part {i+1})", 
                existing_wiki_context,
                staged_context,
                existing_categories,
                source_type
            )

            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._system_prompt()},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.3,
                    max_tokens=4096,
                    response_format={"type": "json_object"},
                )
                chunk_result = json.loads(response.choices[0].message.content)
                merged_result = self._merge_results(merged_result, chunk_result)

            except Exception as e:
                print(f"Groq API error on chunk {i+1}: {e}")
                if i == 0: # If first chunk fails, return error
                    return {
                        "error": str(e),
                        "new_pages": [],
                        "updated_pages": [],
                        "contradictions": [],
                        "summary": f"Failed to process {source_name}",
                    }
                # Otherwise, continue with what we have

        return merged_result

    def _split_text(self, text, max_chars=5000):
        """Split text into chunks by characters, trying to split at newlines."""
        chunks = []
        while len(text) > max_chars:
            # Find the last newline within the limit
            split_at = text.rfind("\n", 0, max_chars)
            if split_at == -1:
                split_at = max_chars
            chunks.append(text[:split_at].strip())
            text = text[split_at:].strip()
        if text:
            chunks.append(text)
        return chunks

    def _merge_results(self, base, chunk):
        """Merges a chunk result into the base result."""
        # Merge new pages
        for np in chunk.get("new_pages", []):
            existing = next((p for p in base["new_pages"] if p["title"] == np["title"]), None)
            if existing:
                existing["content"] = np["content"] # Latest content wins
            else:
                base["new_pages"].append(np)

        # Merge updated pages
        for up in chunk.get("updated_pages", []):
            existing = next((p for p in base["updated_pages"] if p["title"] == up["title"]), None)
            if existing:
                existing["content"] = up["content"]
                existing["changes_summary"] += f" | {up.get('changes_summary', '')}"
            else:
                base["updated_pages"].append(up)

        # Merge contradictions
        base["contradictions"].extend(chunk.get("contradictions", []))
        
        # Merge summary
        if not base["summary"]:
            base["summary"] = chunk.get("summary", "")
        else:
            # Avoid repeating the whole summary if possible, but concat is safest
            base["summary"] += " " + chunk.get("summary", "")
        
        return base

    def _system_prompt(self):
        return """You are Mem, an AI that maintains a personal wiki knowledge base.
Your job is to read new source documents and integrate them into an existing wiki.

You must return ONLY valid JSON, no other text. The JSON must follow this structure:

{
  "new_pages": [
    {
      "title": "Page title (use Title Case with spaces)",
      "content": "Full markdown content of the new page. Use headings, lists, links to other pages as [[Page Name]].",
      "category": "Semantic domain/subject area (e.g. Operating Systems, Finance, AGI & Cognitive)"
    }
  ],
  "updated_pages": [
    {
      "title": "Existing page title to update",
      "content": "The COMPLETE new content for this page (replace entirely, not a diff)",
      "changes_summary": "Brief description of what changed",
      "category": "Semantic domain/subject area"
    }
  ],
  "contradictions": [
    {
      "existing_page": "Page title that has contradictory info",
      "existing_claim": "Quote or summary of the existing claim",
      "new_claim": "Quote or summary from new source",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "One paragraph summary of the new source and how it fits into the wiki"
}

Rules:
- Create entity pages for: people, organizations, concepts, technologies, terms that appear frequently.
- Create concept pages for: ideas, theories, frameworks, methodologies.
- Use [[Page Name]] syntax for internal wiki links.
- If updating a page, provide the COMPLETE new content, not just changes.
- Only flag contradictions when claims are explicitly conflicting (not just different perspectives).
- Be conservative: don't create pages for trivial or one-off mentions.
"""

    def _build_ingest_prompt(self, text, source_name, existing_wiki_context, staged_context="", existing_categories="", source_type="text"):
        context_section = (
            existing_wiki_context
            if existing_wiki_context
            else "No existing wiki pages yet."
        )
        
        staged_section = ""
        if staged_context:
            staged_section = f"\n{staged_context}\nIMPORTANT: You already proposed the pages above from previous parts of this document. If current text adds to them, continue using the same titles to update their content."

        return f"""Source segment to ingest: {source_name} (Type: {source_type})

Source content:
```
{text}
```

Existing wiki context (live pages):
{context_section}

Existing categories in the system:
{existing_categories if existing_categories else 'None yet.'}
{staged_section}

Based ONLY on the source segment provided, generate wiki updates. 
Assign a semantic `category` to every new or updated page. Try to reuse one of the 'Existing categories' if it's a perfect match, otherwise invent a concise new high-level category (e.g. 'Software Engineering', 'Neuroscience', 'Finance').
If information is a continuation of a page already staged, include it in the 'updated_pages' or 'new_pages' with the same title to refine it.
"""

    # ------------------------------------------------------------------
    # Chat / Q&A
    # ------------------------------------------------------------------

    def answer_question(self, question, wiki_pages_content):
        """Answer a natural language question using wiki content"""
        prompt = f"""Question: {question}

Relevant wiki pages:
{wiki_pages_content}

Answer the question based ONLY on the wiki pages above.
- Cite sources by mentioning [[Page Name]].
- If the wiki doesn't contain the answer, say "The wiki doesn't have information about this yet."
- Be concise but thorough.
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You answer questions based on a knowledge base. Be accurate and cite your sources using [[Page Name]].",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                max_tokens=1024,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error: {str(e)}"

    # ------------------------------------------------------------------
    # Streaming chat (for real-time token-by-token responses)
    # ------------------------------------------------------------------

    def stream_answer(self, question, wiki_pages_content):
        """Generator that yields answer tokens as they arrive"""
        prompt = f"""Question: {question}

Relevant wiki pages:
{wiki_pages_content}

Answer based ONLY on the wiki pages. Cite pages using [[Page Name]].
"""
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You answer questions based on a knowledge base. Be accurate and cite sources using [[Page Name]].",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                max_tokens=1024,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as e:
            yield f"Error: {str(e)}"

    # ------------------------------------------------------------------
    # Knowledge Clarity (Phase 1)
    # ------------------------------------------------------------------

    def reconcile_contradiction(self, page_title, existing_claim, new_claim):
        """Use LLM to synthesize two conflicting claims into one."""
        prompt = f"""You are resolving a knowledge contradiction in the page: {page_title}

Existing knowledge:
"{existing_claim}"

New contradictory info from a source:
"{new_claim}"

Your task:
1. Reconcile these two claims into a single, accurate, and clear statement.
2. If one is clearly more detailed or updated, favor it, but preserve context from both if possible.
3. Be concise and authoritative.
4. Return ONLY the new reconciled text, no explanations.

Reconciled text:"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a knowledge architect. Your goal is to synthesize conflicting information into a single grounded truth."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=500,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Error reconciling claims: {str(e)}"



# Singleton instance (created lazily so settings are fully loaded)
groq_client = GroqClient()
