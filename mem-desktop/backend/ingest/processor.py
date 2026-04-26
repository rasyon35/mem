import json
import mimetypes
import hashlib
import subprocess
from pathlib import Path
from datetime import datetime
from django.conf import settings
from .extractors import TextExtractor
from .ai_client import memos_ai as ai_client
from .wiki_context import wiki_context
from .semantic_index import semantic_index
from .models import ClaimRevision, KnowledgeClaim, Source, Contradiction, CriticalPage, RawArtifactLedger
from .policy import policy_engine


class IngestProcessor:
    """Orchestrates the full ingest pipeline: extract → LLM → stage → apply → git commit"""

    def __init__(self):
        self.workspace_root = Path(settings.WORKSPACE_ROOT)
        self.raw_dir = Path(settings.WORKSPACE_RAW_DIR)
        self.wiki_dir = Path(settings.WORKSPACE_WIKI_DIR)
        self.wiki_dir.mkdir(parents=True, exist_ok=True)
        # Ensure wiki is a git repo so commits don't fail
        self._ensure_git_repo()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process_text(self, text, title="Ingested Note", auto_approve=True, user_email=None):
        temp_name = f"{title.replace(' ', '_')[:80]}.md"
        temp_file = self.raw_dir / temp_name
        temp_file.write_text(text, encoding="utf-8")
        return self.process_file(temp_file, auto_approve=auto_approve, user_email=user_email)

    def process_file(self, file_path, auto_approve=False, user_email=None):
        """
        Full pipeline for a single file.
        """
        email = user_email or self._get_user_email()
        role = self._get_user_role(email)

        if role == "viewer":
            return {"error": "Viewers cannot ingest new sources"}

        file_path = Path(file_path)
        source_obj = self._register_raw_artifact(file_path)

        # 1. Extract text
        try:
            text, file_type = TextExtractor.extract(file_path)
        except Exception as exc:
            return {"error": f"Extraction failed: {exc}"}

        if not text or len(text.strip()) < 50:
            return {
                "error": "Could not extract enough text from file",
                "preview": text[:200] if text else "",
            }

        # 2. Existing wiki context (keyword search using filename stem)
        query = file_path.stem.replace("_", " ")
        existing_context = wiki_context.search_pages(query, max_pages=8)
        
        # 2.5 Extract all unique existing categories
        existing_categories = set(["Miscellaneous", "concept", "entity"])
        for md_file in self.wiki_dir.glob("*.md"):
            if md_file.name in ("index.md", "log.md"): continue
            content = md_file.read_text(encoding="utf-8")
            import re
            cat_match = re.search(r"^category:\s*(.+)$", content, re.MULTILINE)
            if cat_match:
                existing_categories.add(cat_match.group(1).strip().strip("'").strip('"'))
        existing_categories_str = ", ".join(sorted(list(existing_categories)))

        # 3. Call Memos AI Gateway
        llm_result = ai_client.generate_wiki_updates(
            text=text,
            source_name=file_path.name,
            existing_wiki_context=existing_context,
            existing_categories=existing_categories_str,
            source_type=file_type,
        )

        if "error" in llm_result and not llm_result.get("new_pages"):
            return {"error": llm_result["error"]}

        # 4. Save Source metadata
        if source_obj.summary != llm_result.get("summary", ""):
            source_obj.summary = llm_result.get("summary", "")
            source_obj.save(update_fields=["summary"])

        # 5. Detect if any critical pages are being updated
        critical = self._get_critical_pages()
        touches_critical = any(
            p["title"] in critical for p in llm_result.get("updated_pages", [])
        )

        # 6. Prepare staged changes with original content for diffing
        updated_pages = []
        for p in llm_result.get("updated_pages", []):
            title = p["title"]
            slug = title.replace(" ", "_")
            wiki_path = self.wiki_dir / f"{slug}.md"
            original = ""
            if wiki_path.exists():
                original = wiki_path.read_text(encoding="utf-8")
            updated_pages.append({**p, "original_content": original})

        staged = {
            "new_pages": llm_result.get("new_pages", []),
            "updated_pages": updated_pages,
            "contradictions": llm_result.get("contradictions", []),
            "summary": llm_result.get("summary", ""),
            "source": file_path.name,
            "source_id": source_obj.id,
            "timestamp": datetime.now().isoformat(),
        }

        # ---------------------------------------------------------
        # NEW WORKFLOW: Create branch -> write -> commit -> back to main
        # ---------------------------------------------------------
        branch_name = f"ingest/ai-{int(datetime.now().timestamp())}"
        staged["branch_name"] = branch_name
        
        # Switch to branch (deterministic and recoverable)
        checkout_result = subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=self.wiki_dir,
            capture_output=True,
            text=True,
        )
        if checkout_result.returncode != 0:
            return {"error": f"Failed to create ingest branch: {checkout_result.stderr.strip()}"}
        
        # Write files for the PR
        self._write_files_for_staged(staged)
        staged["index_updated"] = True
        staged["log_appended"] = True
        staged["contradiction_scan_completed"] = True
        
        # Selective commit on branch
        self._git_commit(f"AI ingest: {file_path.name}")
        
        # Return to main (working directory stays clean)
        subprocess.run(["git", "checkout", self._get_default_branch()], cwd=self.wiki_dir, capture_output=True)

        # 7. Auto-apply if requested and no critical pages touched
        policy_result = policy_engine.evaluate(source_obj, staged, touches_critical=touches_critical)
        staged["policy"] = {
            "passed": policy_result.passed,
            "gate_level": policy_result.gate_level,
            "risk_score": policy_result.risk_score,
            "checks": policy_result.checks,
            "missing": policy_result.missing,
            "remediation_ids": policy_result.remediation_ids,
        }

        if auto_approve and (policy_result.passed or policy_result.gate_level == "soft") and not touches_critical:
            return self.apply_changes(staged)

        return {
            "status": "staged",
            "needs_approval": touches_critical,
            "proposed_changes": staged,
            "preview": {
                "summary": staged["summary"],
                "new_pages": [p["title"] for p in staged["new_pages"]],
                "updated_pages": [p["title"] for p in staged["updated_pages"]],
                "contradictions": len(staged["contradictions"]),
                "branch": branch_name
            },
            "policy": staged["policy"],
        }

    def _register_raw_artifact(self, file_path: Path):
        canonical_path = str(file_path.resolve())
        source_obj, _ = Source.objects.get_or_create(
            path_or_url=canonical_path,
            defaults={
                "name": file_path.name,
                "source_type": "file",
                "summary": "",
            },
        )
        raw_bytes = file_path.read_bytes()
        digest = hashlib.sha256(raw_bytes).hexdigest()
        mime_type, _ = mimetypes.guess_type(file_path.name)
        RawArtifactLedger.objects.create(
            source=source_obj,
            sha256=digest,
            mime_type=mime_type or "application/octet-stream",
            canonical_path=canonical_path,
            size_bytes=len(raw_bytes),
        )
        return source_obj

    def _write_files_for_staged(self, staged_changes):
        """Helper to write markdown files based on staged changes (used on branch)"""
        for page in staged_changes.get("new_pages", []):
            title = page["title"]
            slug = title.replace(" ", "_")
            file_path = self.wiki_dir / f"{slug}.md"

            page_category = page.get("category", "Miscellaneous")
            sources_list = page.get("sources", [staged_changes.get("source", "unknown")])
            sources_str = ", ".join(sources_list)
            
            frontmatter = (
                f"---\n"
                f"title: {title}\n"
                f"created: {datetime.now().isoformat()}\n"
                f"sources: [{sources_str}]\n"
                f"type: concept\n"
                f"category: {page_category}\n"
                f"---\n\n"
            )
            file_path.write_text(frontmatter + page["content"], encoding="utf-8")

        for page in staged_changes.get("updated_pages", []):
            title = page["title"]
            slug = title.replace(" ", "_")
            file_path = self.wiki_dir / f"{slug}.md"
            page_category = page.get("category", "")

            if file_path.exists():
                existing = file_path.read_text(encoding="utf-8")
                if existing.startswith("---"):
                    parts = existing.split("---", 2)
                    if len(parts) >= 3:
                        fm_block = parts[1]
                        if page_category:
                            import re as _re
                            if _re.search(r"^category:", fm_block, _re.MULTILINE):
                                fm_block = _re.sub(r"^category:.*$", f"category: {page_category}", fm_block, flags=_re.MULTILINE)
                            else:
                                fm_block = fm_block.rstrip("\n") + f"\ncategory: {page_category}\n"
                        new_content = f"---{fm_block}---\n\n{page['content']}"
                        file_path.write_text(new_content, encoding="utf-8")
                        continue

            file_path.write_text(page["content"], encoding="utf-8")
            
        # Rebuild text index and log on the branch as well so they are part of the PR
        self._rebuild_text_index()
        self._append_to_log(staged_changes)

    def apply_changes(self, staged_changes, user_email=None):
        """Merge the staged branch into main."""
        email = user_email or self._get_user_email()
        role = self._get_user_role(email)

        if role not in ("admin", "editor"):
            return {"error": f"Role '{role}' is not authorized to merge changes"}

        branch_name = staged_changes.get("branch_name")
        changes_made = []

        if branch_name:
            # Execute Git Merge
            default_branch = self._get_default_branch()
            subprocess.run(["git", "checkout", default_branch], cwd=self.wiki_dir, capture_output=True)
            result = subprocess.run(
                ["git", "merge", branch_name, "--no-ff", "-m", f"Approved PR: {branch_name}"],
                cwd=self.wiki_dir,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                changes_made.append(f"Merged branch {branch_name} into {default_branch}")
                # Optional: delete the branch after successful merge
                subprocess.run(["git", "branch", "-d", branch_name], cwd=self.wiki_dir, capture_output=True)
            else:
                return {"error": f"Merge failed. Conflict? {result.stderr}"}
        else:
            # Fallback for old staged data without a branch
            self._write_files_for_staged(staged_changes)
            self._git_commit(f"ingest: {staged_changes.get('source', 'unknown')}")
            changes_made.append("Applied changes directly to main (legacy)")

        # Rebuild ChromaDB Semantic Index now that we are on main
        try:
            semantic_index.index_all()
            changes_made.append("Rebuilt Semantic Index")
        except Exception as e:
            print(f"Semantic indexing failed: {e}")

        # Store contradictions and provenance
        self._store_contradictions(staged_changes)
        self._store_provenance(staged_changes)
        self._store_claims(staged_changes)

        return {
            "status": "applied",
            "changes": changes_made,
            "contradictions": staged_changes.get("contradictions", []),
            "summary": staged_changes.get("summary", ""),
        }

    # ------------------------------------------------------------------
    # Wiki management helpers
    # ------------------------------------------------------------------

    def _get_user_email(self):
        """Get the current user's email from git config"""
        try:
            res = subprocess.run(
                ["git", "config", "user.email"],
                cwd=self.wiki_dir,
                capture_output=True,
                text=True,
            )
            return res.stdout.strip() or "local@user"
        except Exception:
            return "local@user"

    def _get_user_role(self, email):
        """Determine role from _config/team.json"""
        team_file = self.wiki_dir / "_config" / "team.json"
        
        # If no team file exists, first user is Admin
        if not team_file.exists():
            return "admin"
            
        try:
            team = json.loads(team_file.read_text())
            if email in team.get("admins", []): return "admin"
            if email in team.get("editors", []): return "editor"
            if email in team.get("contributors", []): return "contributor"
            if email in team.get("viewers", []): return "viewer"
        except Exception:
            pass
            
        return "viewer" # Default to safest

    def _get_critical_pages(self):
        """Load list of page titles that require explicit approval before updating"""
        config_file = self.wiki_dir / "_config" / "critical_pages.txt"
        if config_file.exists():
            try:
                return [
                    line.strip()
                    for line in config_file.read_text().splitlines()
                    if line.strip()
                ]
            except Exception:
                pass
        return []

    def _rebuild_text_index(self):
        """Regenerate index.md (legacy keyword index)"""
        index = "# Wiki Index\n\n"
        cats = {
            "entity": [],
            "concept": [],
            "summary": [],
            "source": [],
        }

        for md_file in sorted(self.wiki_dir.glob("*.md")):
            if md_file.name in ("index.md", "log.md"):
                continue

            content = md_file.read_text(encoding="utf-8")
            page_type = "concept"
            for t in ("entity", "summary", "source", "concept"):
                if f"type: {t}" in content:
                    page_type = t
                    break

            description = ""
            for line in content.splitlines():
                if line.startswith("# ") and len(line) > 2:
                    description = line[2:].strip()[:100]
                    break
                if len(line) > 10 and not line.startswith("---") and not line.startswith("#"):
                    description = line.strip()[:100]
                    break

            cats.setdefault(page_type, []).append(
                f"- [[{md_file.stem}]]: {description}"
            )

        for cat, pages in cats.items():
            if pages:
                index += f"## {cat.upper()}S\n\n" + "\n".join(pages) + "\n\n"

        (self.wiki_dir / "index.md").write_text(index, encoding="utf-8")

    def _append_to_log(self, staged_changes):
        """Prepend an entry to log.md (newest first)"""
        log_file = self.wiki_dir / "log.md"
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = (
            f"\n## [{ts}] ingest | {staged_changes.get('source', 'unknown')}\n"
            f"- Summary: {staged_changes.get('summary', '')[:300]}\n"
            f"- New pages: {len(staged_changes.get('new_pages', []))}\n"
            f"- Updated pages: {len(staged_changes.get('updated_pages', []))}\n"
            f"- Contradictions: {len(staged_changes.get('contradictions', []))}\n"
        )

        if log_file.exists():
            current = log_file.read_text(encoding="utf-8")
            log_file.write_text(entry + current, encoding="utf-8")
        else:
            log_file.write_text(f"# Mem Wiki Log\n{entry}", encoding="utf-8")

    def _ensure_git_repo(self):
        """Initialize a git repo in wiki_dir if one doesn't exist"""
        git_dir = self.wiki_dir / ".git"
        if not git_dir.exists():
            subprocess.run(["git", "init", "-b", "main"], cwd=self.wiki_dir, capture_output=True)
            subprocess.run(
                ["git", "config", "user.email", "mem@local"],
                cwd=self.wiki_dir,
                capture_output=True,
            )
            subprocess.run(
                ["git", "config", "user.name", "Mem Bot"],
                cwd=self.wiki_dir,
                capture_output=True,
            )
            # Create an initial commit so we can branch off main immediately
            (self.wiki_dir / "index.md").write_text("# Initial Commit\n", encoding="utf-8")
            subprocess.run(["git", "add", "index.md"], cwd=self.wiki_dir, capture_output=True)
            subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=self.wiki_dir, capture_output=True)

    def _get_default_branch(self):
        """Return default branch name available in local wiki repository."""
        try:
            res = subprocess.run(
                ["git", "branch", "--list"],
                cwd=self.wiki_dir,
                capture_output=True,
                text=True,
            )
            branches = res.stdout
            if " main" in branches or "* main" in branches:
                return "main"
            if " master" in branches or "* master" in branches:
                return "master"
        except Exception:
            pass
        return "main"

    def _git_commit(self, message):
        """Stage specific files and commit"""
        try:
            # Gather all md files instead of adding everything
            md_files = [f.name for f in self.wiki_dir.glob("*.md")]
            if md_files:
                # Selective commit!
                subprocess.run(["git", "add"] + md_files, cwd=self.wiki_dir, capture_output=True)

            result = subprocess.run(
                ["git", "commit", "-m", message],
                cwd=self.wiki_dir,
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                print(f"Git commit note: {result.stderr.strip()}")
        except Exception as exc:
            print(f"Git commit failed: {exc}")

    def _store_contradictions(self, staged_changes):
        """Store contradictions in SQLite for later querying"""
        source_id = staged_changes.get("source_id")
        if not source_id:
            return

        try:
            source = Source.objects.get(id=source_id)
            for contra in staged_changes.get("contradictions", []):
                Contradiction.objects.create(
                    source=source,
                    existing_page=contra.get("existing_page", "unknown"),
                    existing_claim=contra.get("existing_claim", ""),
                    new_claim=contra.get("new_claim", ""),
                    confidence=contra.get("confidence", "low"),
                    status="pending",
                )
        except Exception as e:
            print(f"Error storing contradictions: {e}")


    def _store_provenance(self, staged_changes):
        """Store chunk-level provenance linking pages to their sources"""
        source_id = staged_changes.get("source_id")
        if not source_id:
            return

        from .models import Source, PageSource
        try:
            source = Source.objects.get(id=source_id)
            
            # Combine new and updated pages to process them all
            all_pages = staged_changes.get("new_pages", []) + staged_changes.get("updated_pages", [])
            
            for page in all_pages:
                chunk_text = page.get("source_chunk")
                page_reference = page.get("source_reference")
                
                # Only save if we actually have provenance details
                if chunk_text or page_reference:
                    PageSource.objects.create(
                        page_title=page.get("title", "unknown"),
                        source=source,
                        page_reference=page_reference or "",
                        chunk_text=chunk_text or "",
                    )
        except Exception as e:
            print(f"Error storing provenance: {e}")

    def _store_claims(self, staged_changes):
        source_id = staged_changes.get("source_id")
        if not source_id:
            return
        source = Source.objects.filter(id=source_id).first()
        if not source:
            return
        all_pages = staged_changes.get("new_pages", []) + staged_changes.get("updated_pages", [])
        for page in all_pages:
            title = page.get("title", "unknown")
            content = page.get("content", "")
            claim_text = content.split(".")[0][:800].strip() or content[:800].strip()
            if not claim_text:
                continue
            claim = KnowledgeClaim.objects.create(
                page_title=title,
                claim_text=claim_text,
                source=source,
                confidence="medium",
            )
            ClaimRevision.objects.create(
                claim=claim,
                revision_text=claim_text,
                note="created during ingest apply",
            )

# Singleton
ingest_processor = IngestProcessor()
