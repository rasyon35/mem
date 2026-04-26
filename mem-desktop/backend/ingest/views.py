from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json
import re
import time
import hashlib
from pathlib import Path
from urllib.parse import urlparse
from django.conf import settings
from django.utils.text import slugify
from git import Repo

from .extractors import TextExtractor
from .processor import ingest_processor
from .wiki_context import wiki_context
from .ai_client import memos_ai as ai_client
from .models import (
    Source,
    Contradiction,
    PageSource,
    RawArtifactLedger,
)
from .semantic_index import semantic_index
from knowledge.models import WorkspacePage, PageBlock
from knowledge.wiki_projection import write_page_to_file, sync_wiki_to_db
from .views_lint import (
    run_lint,
    lint_status,
    lint_findings,
    lint_autofix,
    lint_research_prompts,
    remediation_tasks,
    remediation_update,
    query_artifacts,
    undo_query_artifact,
)
from .views_collab import (
    manage_team,
    manage_locks,
    sync_status,
    get_git_conflicts,
    resolve_conflict,
    track_activity,
    get_presence,
)

WORKSPACE_ROOT = Path(settings.WORKSPACE_ROOT)
WORKSPACE_WIKI_DIR = Path(settings.WORKSPACE_WIKI_DIR)
WORKSPACE_RAW_DIR = Path(settings.WORKSPACE_RAW_DIR)


def _artifact_slug(question: str):
    base = slugify(question[:80]) or f"analysis-{int(time.time())}"
    return f"analysis-{base}-{int(time.time())}"


def _persist_query_artifact(question: str, answer: str, citations: list, confidence: str, page_context: str = ""):
    slug = _artifact_slug(question)
    title = f"Analysis {time.strftime('%Y-%m-%d %H:%M')}"
    page, _ = WorkspacePage.objects.get_or_create(
        slug=slug,
        defaults={
            "title": title,
            "description": "Auto-saved from query response.",
            "page_type": "analysis",
            "status": "active",
        },
    )
    page.blocks.all().delete()
    PageBlock.objects.create(page=page, block_type="heading", content_json={"text": title}, order_index=0)
    PageBlock.objects.create(page=page, block_type="paragraph", content_json={"text": answer}, order_index=1)
    write_page_to_file(page)
    from .models import QueryArtifact, ArtifactRevision

    artifact = QueryArtifact.objects.create(
        query_text=question,
        page_context=page_context,
        artifact_slug=slug,
        artifact_title=title,
        confidence=confidence,
        citations_json=citations,
        is_active=True,
    )
    ArtifactRevision.objects.create(
        artifact=artifact,
        content=answer,
        note="initial auto-compounded answer",
    )
    return artifact


def _append_metric_event(event_name, payload=None):
    """Append KPI/telemetry event to local workspace metrics log."""
    metrics_dir = WORKSPACE_ROOT / "_metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    events_file = metrics_dir / "events.jsonl"
    event = {
        "event": event_name,
        "timestamp": time.time(),
        "payload": payload or {},
    }
    with events_file.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=True) + "\n")


# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------

@api_view(["POST"])
def ingest_file(request):
    """
    Full pipeline: extract → Groq LLM → stage (or auto-apply).

    Body (multipart/form-data):
        file:         uploaded file  OR
        url:          web URL
        auto_approve: "true" / "false"  (default false)
    """
    raw_dir = WORKSPACE_RAW_DIR
    raw_dir.mkdir(parents=True, exist_ok=True)

    auto_approve = str(request.data.get("auto_approve", "false")).lower() == "true"

    # --- File upload ---
    if "file" in request.FILES:
        uploaded = request.FILES["file"]
        file_path = raw_dir / uploaded.name
        with open(file_path, "wb") as f:
            for chunk in uploaded.chunks():
                f.write(chunk)

        result = ingest_processor.process_file(file_path, auto_approve=auto_approve)
        _append_metric_event(
            "ingest_file_completed",
            {
                "source_type": "file",
                "auto_approve": auto_approve,
                "has_error": bool(result.get("error")) if isinstance(result, dict) else False,
                "status": result.get("status") if isinstance(result, dict) else "unknown",
            },
        )
        return Response(result, status=status.HTTP_200_OK)

    # --- URL ---
    if "url" in request.data:
        url = request.data["url"]
        try:
            text, _ = TextExtractor.extract(url)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        domain = urlparse(url).netloc.replace(".", "_")
        url_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]
        filename = f"web_{domain}_{url_hash}.md"
        file_path = raw_dir / filename
        file_path.write_text(f"# Source: {url}\n\n{text}", encoding="utf-8")

        result = ingest_processor.process_file(file_path, auto_approve=auto_approve)
        _append_metric_event(
            "ingest_file_completed",
            {
                "source_type": "url",
                "auto_approve": auto_approve,
                "has_error": bool(result.get("error")) if isinstance(result, dict) else False,
                "status": result.get("status") if isinstance(result, dict) else "unknown",
            },
        )
        return Response(result, status=status.HTTP_200_OK)

    return Response(
        {"error": "No file or URL provided"}, status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["POST"])
def ingest_text(request):
    """Ingest plain text content from wiki-side new-ingest flows."""
    text = str(request.data.get("text", "")).strip()
    title = str(request.data.get("title", "")).strip() or f"Ingested Note {int(time.time())}"
    auto_approve = str(request.data.get("auto_approve", "true")).lower() == "true"
    if not text:
        return Response({"error": "No text provided"}, status=status.HTTP_400_BAD_REQUEST)
    result = ingest_processor.process_text(text, title=title, auto_approve=auto_approve)
    _append_metric_event(
        "ingest_text_completed",
        {
            "title": title,
            "auto_approve": auto_approve,
            "has_error": bool(result.get("error")) if isinstance(result, dict) else False,
            "status": result.get("status") if isinstance(result, dict) else "unknown",
        },
    )
    return Response(result, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Approve staged changes
# ---------------------------------------------------------------------------

@api_view(["POST"])
def approve_changes(request):
    """
    Apply previously staged changes to the wiki.

    Body (JSON):
        changes: <staged_changes object returned by /ingest>
    """
    staged = request.data.get("changes")
    if not staged:
        return Response(
            {"error": "No changes provided"}, status=status.HTTP_400_BAD_REQUEST
        )

    policy = staged.get("policy", {})
    if policy.get("gate_level") == "hard" and not policy.get("passed"):
        return Response(
            {
                "error": "Policy hard-gate failed.",
                "policy": policy,
            },
            status=status.HTTP_409_CONFLICT,
        )
    result = ingest_processor.apply_changes(staged)
    if policy:
        result["policy"] = policy
    _append_metric_event(
        "approve_changes_completed",
        {
            "has_error": bool(result.get("error")) if isinstance(result, dict) else False,
            "status": result.get("status") if isinstance(result, dict) else "unknown",
        },
    )
    return Response(result, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Chat / Q&A
# ---------------------------------------------------------------------------

@api_view(["POST"])
def chat_query(request):
    """
    Answer a question using the wiki.

    Body (JSON):
        question: str
        page_context: str (optional) – title of the page the user is currently viewing
    """
    question = request.data.get("question", "").strip()
    if not question:
        return Response(
            {"error": "No question provided"}, status=status.HTTP_400_BAD_REQUEST
        )

    page_title = request.data.get("page_context", "").strip()
    surface = str(request.data.get("surface", "main")).strip() or "main"

    context = ""
    if page_title:
        # Priority 1: Read the full current page content
        current_page = wiki_context.get_page(page_title)
        if current_page:
            context += f"\n## CURRENT FOCUS PAGE: [[{page_title}]]\n{current_page}\n---\n"

            # Priority 2: Find linked pages via [[Page Name]] syntax and include them
            import re as _re
            linked_titles = _re.findall(r"\[\[([^\]]+)\]\]", current_page)
            for linked_title in linked_titles[:5]:
                linked_content = wiki_context.get_page(linked_title)
                if linked_content:
                    context += f"\n## RELATED (Linked from {page_title}): [[{linked_title}]]\n{linked_content[:800]}\n---\n"

            # Priority 3: Find "Backlinks" (pages that link TO this page)
            all_titles = wiki_context.get_all_page_titles()
            backlink_count = 0
            for other_title in all_titles:
                if other_title == page_title: continue
                other_content = wiki_context.get_page(other_title)
                if other_content and f"[[{page_title}]]" in other_content:
                    context += f"\n## RELATED (Links to {page_title}): [[{other_title}]]\n{other_content[:600]}\n---\n"
                    backlink_count += 1
                    if backlink_count >= 3: break

        # Priority 4: Also do a keyword search for the question itself
        extra = wiki_context.search_pages(question, max_pages=3)
        if extra:
            context += f"\n## ADDITIONAL RELEVANT INFO:\n{extra}"
    else:
        # No page context – fall back to keyword search (main chat page behavior)
        context = wiki_context.search_pages(question, max_pages=8)
        if not context:
            context = wiki_context.get_index()

    answer = ai_client.answer_question(question, wiki_pages_content=context)
    citations = []

    def _build_citation(title, snippet, relevance_score):
        citation = {
            "page_title": title,
            "snippet": snippet,
            "type": "wiki_page",
            "relevance_score": relevance_score,
        }
        try:
            source_link = PageSource.objects.filter(page_title__iexact=title).select_related("source").order_by("-created_at").first()
            if source_link:
                citation.update({
                    "source_type": source_link.source.source_type,
                    "source_name": source_link.source.name,
                    "source_path_or_url": source_link.source.path_or_url,
                    "page_reference": source_link.page_reference,
                    "evidence_snippet": source_link.chunk_text[:240] if source_link.chunk_text else snippet,
                })
            else:
                citation["evidence_snippet"] = snippet
        except Exception:
            citation["evidence_snippet"] = snippet
        return citation

    if page_title:
        snippet = (context[:220] + "...") if len(context) > 220 else context
        citations.append(_build_citation(page_title, snippet, 0.95))
    else:
        # Best-effort citation extraction from context headers.
        seen = set()
        for idx, match in enumerate(re.findall(r"\[\[([^\]]+)\]\]", context)):
            if match in seen:
                continue
            seen.add(match)
            citations.append(_build_citation(match, f"Referenced from workspace context: {match}", max(0.4, 0.85 - (idx * 0.15))))
            if len(citations) >= 3:
                break
    confidence = "high" if page_title else ("medium" if len(citations) >= 2 else "low")
    reasoning_summary = "Answer grounded in local wiki context and related pages."
    artifact = None
    if getattr(settings, "AUTO_QUERY_COMPOUND_ENABLED", True):
        try:
            sync_wiki_to_db()
            artifact = _persist_query_artifact(
                question=question,
                answer=answer,
                citations=citations,
                confidence=confidence,
                page_context=page_title,
            )
        except Exception:
            artifact = None
    _append_metric_event(
        "chat_query_completed",
        {"with_page_context": bool(page_title), "question_len": len(question), "surface": surface},
    )
    return Response(
        {
            "answer": answer,
            "citations": citations,
            "confidence": confidence,
            "reasoning_summary": reasoning_summary,
            "artifact": (
                {
                    "id": artifact.id,
                    "slug": artifact.artifact_slug,
                    "title": artifact.artifact_title,
                }
                if artifact
                else None
            ),
        },
        status=status.HTTP_200_OK,
    )



# ---------------------------------------------------------------------------
# Wiki listing (for sidebar / explorer)
# ---------------------------------------------------------------------------



# ---------------------------------------------------------------------------
# History, Snapshots & Git
# ---------------------------------------------------------------------------

@api_view(["POST"])
def create_snapshot(request):
    """Create a milestone git tag for the current workspace state"""
    name = request.data.get("name")
    if not name:
        return Response({"error": "Snapshot name is required"}, status=400)
    
    # Sanitize name for git tag
    tag_name = name.strip().replace(" ", "_").replace("/", "-")
    
    wiki_dir = WORKSPACE_WIKI_DIR
    try:
        repo = Repo(wiki_dir)
        new_tag = repo.create_tag(tag_name, message=f"Snapshot: {name}")
        return Response({"status": "success", "tag": new_tag.name})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def list_snapshots(request):
    """List all created milestones (git tags)"""
    wiki_dir = WORKSPACE_WIKI_DIR
    try:
        repo = Repo(wiki_dir)
        tags = []
        for t in repo.tags:
            try:
                commit = t.commit
                tags.append({
                    "name": t.name,
                    "commit": commit.hexsha,
                    "time": commit.committed_datetime.isoformat()
                })
            except Exception:
                pass
        tags.sort(key=lambda x: x["time"], reverse=True)
        return Response({"snapshots": tags})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def get_git_history(request):
    """Return the recent git commit history, optionally filtered by page"""
    page = request.query_params.get("page")
    wiki_dir = WORKSPACE_WIKI_DIR
    try:
        repo = Repo(wiki_dir)
        commits = []
        try:
            kwargs = {"max_count": 30}
            paths = None
            if page:
                paths = f"{page}.md"
            
            for commit in repo.iter_commits(paths=paths, **kwargs):
                commits.append({
                    "hash": commit.hexsha,
                    "short_hash": commit.hexsha[:7],
                    "message": commit.message,
                    "author": commit.author.name,
                    "timestamp": commit.authored_datetime.isoformat(),
                })
        except Exception:
            pass # No commits yet
        return Response({"commits": commits}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"Failed to retrieve history: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def list_pull_requests(request):
    """List all unmerged ingest branches"""
    wiki_dir = WORKSPACE_WIKI_DIR
    try:
        repo = Repo(wiki_dir)
        prs = []
        for head in repo.heads:
            if head.name.startswith("ingest/"):
                commit = head.commit
                prs.append({
                    "branch": head.name,
                    "message": commit.message,
                    "author": commit.author.name,
                    "timestamp": commit.authored_datetime.isoformat(),
                    "hash": commit.hexsha[:7]
                })
        # Sort newest first
        prs.sort(key=lambda x: x["timestamp"], reverse=True)
        return Response({"pull_requests": prs}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"Failed to list PRs: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_pull_request_diff(request):
    """Get the diff between an ingest branch and main"""
    branch = request.query_params.get("branch")
    wiki_dir = WORKSPACE_WIKI_DIR
    if not branch:
        return Response({"error": "No branch provided"}, status=400)
        
    try:
        repo = Repo(wiki_dir)
        base = repo.heads.main.commit
        head = repo.heads[branch].commit
        
        diff_index = base.diff(head, create_patch=True)
        changes = []
        
        for diff in diff_index:
            file_name = diff.b_path or diff.a_path
            # Provide raw text of the patch
            patch = diff.diff.decode('utf-8') if diff.diff else ""
            
            changes.append({
                "file": file_name,
                "type": diff.change_type, # 'A' add, 'M' modify, 'D' delete
                "patch": patch
            })
            
        return Response({
            "branch": branch,
            "message": head.message,
            "changes": changes
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"Failed to get diff: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def revert_version(request):
    """Revert the wiki to a specific commit hash"""
    commit_hash = request.data.get("commit_hash")
    if not commit_hash:
        return Response({"error": "No commit hash provided"}, status=status.HTTP_400_BAD_REQUEST)

    wiki_dir = WORKSPACE_WIKI_DIR
    try:
        repo = Repo(wiki_dir)
        # We do a revert by checking out the files and then committing that state
        repo.git.checkout(commit_hash, ".")
        repo.git.add("*.md")
        repo.index.commit(f"revert to {commit_hash[:7]}")

        # Trigger an index rebuild after revert
        ingest_processor._rebuild_text_index()
        from .semantic_index import semantic_index
        semantic_index.index_all()

        return Response({"status": "reverted", "message": f"Wiki reverted to {commit_hash[:7]}"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"Revert failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Management: Contradictions & Critical Pages
# ---------------------------------------------------------------------------

@api_view(["GET", "POST", "DELETE"])
def manage_critical_pages(request):
    """Manage critical pages via the _config/critical_pages.txt file"""
    wiki_dir = WORKSPACE_WIKI_DIR
    config_path = wiki_dir / "_config" / "critical_pages.txt"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    if not config_path.exists():
        config_path.touch()

    if request.method == "GET":
        try:
            pages = config_path.read_text().splitlines()
            data = [{"id": i, "title": p.strip()} for i, p in enumerate(pages) if p.strip()]
            return Response({"critical_pages": data}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"critical_pages": []})

    if request.method == "POST":
        title = request.data.get("title")
        if title:
            pages = config_path.read_text().splitlines()
            if title not in [p.strip() for p in pages]:
                with config_path.open("a") as f:
                    f.write(f"{title}\n")
        return Response({"status": "added", "title": title}, status=status.HTTP_200_OK)

    if request.method == "DELETE":
        title = request.data.get("title")
        if title:
            pages = config_path.read_text().splitlines()
            new_pages = [p for p in pages if p.strip() != title.strip()]
            config_path.write_text("\n".join(new_pages) + ("\n" if new_pages else ""))
        return Response({"status": "deleted", "title": title}, status=status.HTTP_200_OK)


@api_view(["GET", "PATCH"])
def list_contradictions(request):
    """List contradictions or resolve them"""
    if request.method == "GET":
        status_filter = request.query_params.get("status", "pending")
        unresolved = Contradiction.objects.filter(status=status_filter).select_related("source")
        data = []
        for c in unresolved:
            data.append({
                "id": c.id,
                "source_name": c.source.name,
                "page": c.existing_page,
                "existing": c.existing_claim,
                "new": c.new_claim,
                "confidence": c.confidence,
                "status": c.status,
                "timestamp": c.created_at.isoformat(),
            })
        return Response({"contradictions": data}, status=status.HTTP_200_OK)

    if request.method == "PATCH":
        c_id = request.data.get("id")
        action = request.data.get("action") # 'accept', 'dismiss', 'merge'
        try:
            c = Contradiction.objects.get(id=c_id)
            WikiContext = __import__('ingest.wiki_context', fromlist=['wiki_context']).wiki_context
            
            if action == "merge":
                # AI driven reconciliation
                reconciled_text = ai_client.reconcile_contradiction(
                    page_title=c.existing_page,
                    existing_claim=c.existing_claim,
                    new_claim=c.new_claim
                )
                
                # Apply to wiki page
                wiki_dir = WORKSPACE_WIKI_DIR
                slug = c.existing_page.replace(" ", "_")
                file_path = wiki_dir / f"{slug}.md"
                
                if file_path.exists():
                    content = file_path.read_text(encoding="utf-8")
                    # Simple replacement logic (can be refined)
                    new_content = content.replace(c.existing_claim, reconciled_text)
                    file_path.write_text(new_content, encoding="utf-8")
                    
                    # Git commit
                    from git import Repo
                    repo = Repo(wiki_dir)
                    repo.git.add(str(file_path))
                    repo.index.commit(f"resolved contradiction in {c.existing_page} via AI merge")
                
                c.status = "accepted"
                c.save()
                return Response({"status": "resolved", "action": "merged", "reconciled": reconciled_text})
                
            if action == "accept":
                c.status = "accepted"
                c.save()
                return Response({"status": "resolved", "action": "accepted"})
            elif action == "dismiss":
                c.status = "dismissed"
                c.save()
                return Response({"status": "resolved", "action": "dismissed"})
            return Response({"error": "Invalid action"}, status=400)
        except Contradiction.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)



# Collaboration and lint/query artifact operational views were moved to
# `views_collab.py` and `views_lint.py` to keep this file focused.

@api_view(['GET'])
def get_suggestions(request):
    """Suggests conceptual links for a specific page"""
    title = request.GET.get('page')
    if not title:
        return Response({"error": "Missing page title"}, status=400)
    
    from .wiki_context import wiki_context
    suggestions = wiki_context.get_suggested_links(title)
    return Response({"suggestions": suggestions}, status=200)

@api_view(['GET'])
def synthesize_hub(request):
    """
    Analyzes a graph hub and explains the conceptual relationship 
    between all its connected members.
    """
    hub_title = request.GET.get('hub')
    if not hub_title:
        return Response({"error": "Missing hub title"}, status=400)
        
    from .wiki_context import wiki_context
    wiki_dir = WORKSPACE_WIKI_DIR
    
    # 1. Identify connected nodes (poor man's graph traversal)
    # Re-reading all files to find links to this hub
    members = []
    for md_file in wiki_dir.glob("*.md"):
        if md_file.name in ("index.md", "log.md"): continue
        content = md_file.read_text(encoding="utf-8")
        if f"[[{hub_title}" in content or f"[[{hub_title.replace('_', ' ')}" in content:
            members.append(f"- {md_file.stem}: {content[:200]}...")

    if not members:
        return Response({"synthesis": f"This hub currently has no explicit connections in the wiki content."}, status=200)

    # 2. Ask LLM to synthesize
    member_list = "\n".join(members[:15]) # Limit for context
    prompt = f"""You are a Knowledge Architect. I have a 'Hub' in my knowledge graph called '{hub_title}'.
The following pages are connected to it:
{member_list}

Your task: Write a 2-3 sentence 'Explainer' that synthesizes WHY these pages are related to {hub_title} and what conceptual area this cluster represents. 
Focus on high-level structural intelligence.
"""
    try:
        synthesis = ai_client.chat_completion(
            messages=[
                {"role": "system", "content": "You synthesize complex conceptual relationships in a knowledge graph."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=500
        )
        return Response({"synthesis": synthesis}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)





# ---------------------------------------------------------------------------
# Bulk Re-categorization
# ---------------------------------------------------------------------------

@api_view(["POST"])
def reorganize_categories(request):
    """
    LLM-driven bulk re-categorization.
    Reads all wiki pages, asks the LLM to propose a category for each,
    and returns a preview for human approval (no files are changed).
    """
    wiki_dir = WORKSPACE_WIKI_DIR
    pages = []

    for md_file in sorted(wiki_dir.glob("*.md")):
        if md_file.name in ("index.md", "log.md"):
            continue
        content = md_file.read_text(encoding="utf-8")
        # Extract current category
        current_cat = "Miscellaneous"
        cat_match = re.search(r"^category:\s*(.+)$", content, re.MULTILINE)
        if cat_match:
            current_cat = cat_match.group(1).strip().strip("'").strip('"')
        # Extract first heading for description
        desc = md_file.stem.replace("_", " ")
        pages.append({
            "title": md_file.stem,
            "current_category": current_cat,
            "description": desc
        })

    # Ask LLM to propose categories in chunks (Groq free tier has low TPM)
    BATCH_SIZE = 40
    all_proposed = {}

    for batch_start in range(0, len(pages), BATCH_SIZE):
        batch = pages[batch_start:batch_start + BATCH_SIZE]
        page_list = "\n".join([f"- {p['title']} (current: {p['current_category']})" for p in batch])

        prompt = f"""You are organizing a personal wiki knowledge base. Below is a BATCH of pages with their current categories.

Your job: Propose the best semantic category for EACH page. Categories should be high-level subject areas (e.g., "Operating Systems", "Logic & Reasoning", "AGI & Cognitive", "Algorithms", "Finance", "Software Engineering", "AI Technology", "Mathematics", "People & Organizations").

Rules:
- Reuse categories across pages wherever applicable (try to have 5-12 total categories).
- Every page must get exactly one category.
- Return ONLY valid JSON: {{"pages": [{{"title": "Page_Name", "category": "Category Name"}}]}}

Page list:
{page_list}
"""
        try:
            response_text = ai_client.chat_completion(
                messages=[
                    {"role": "system", "content": "You organize knowledge into semantic categories. Return only JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )
            chunk_result = json.loads(response_text)
            for p in chunk_result.get("pages", []):
                all_proposed[p["title"]] = p.get("category", "Miscellaneous")
        except Exception as e:
            print(f"LLM batch error at offset {batch_start}: {e}")
            # Continue with remaining batches

        # Delay between batches to avoid rate limits
        if batch_start + BATCH_SIZE < len(pages):
            time.sleep(2)

    # Merge LLM suggestions with current state for human review
    preview = []
    for p in pages:
        preview.append({
            "title": p["title"],
            "current_category": p["current_category"],
            "proposed_category": all_proposed.get(p["title"], p["current_category"]),
        })

    return Response({"preview": preview}, status=200)


@api_view(["POST"])
def apply_categories(request):
    """
    Apply human-approved category reassignments.
    Body: {"assignments": [{"title": "Page_Name", "category": "New Category"}, ...]}
    """
    assignments = request.data.get("assignments", [])
    if not assignments:
        return Response({"error": "No assignments provided"}, status=400)

    wiki_dir = WORKSPACE_WIKI_DIR
    updated = []

    for item in assignments:
        title = item.get("title", "")
        new_cat = item.get("category", "")
        if not title or not new_cat:
            continue

        file_path = wiki_dir / f"{title}.md"
        if not file_path.exists():
            continue

        content = file_path.read_text(encoding="utf-8")

        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                fm = parts[1]
                if re.search(r"^category:", fm, re.MULTILINE):
                    fm = re.sub(r"^category:.*$", f"category: {new_cat}", fm, flags=re.MULTILINE)
                else:
                    fm = fm.rstrip("\n") + f"\ncategory: {new_cat}\n"
                content = f"---{fm}---{parts[2]}"
                file_path.write_text(content, encoding="utf-8")
                updated.append(title)

    return Response({"status": "applied", "updated": updated, "count": len(updated)}, status=200)

# OpenClaw and Zapier integrations were removed from MemOS.

import subprocess

@api_view(["POST"])
def open_source_file(request):
    """Open a local source file at a specific page using the system's default viewer."""
    path = request.data.get("path")
    page = request.data.get("page", 1)
    
    if not path or not Path(path).exists():
        raw_dir = WORKSPACE_RAW_DIR
        alt_path = raw_dir / Path(path).name
        if alt_path.exists():
            path = str(alt_path)
        else:
            return Response({"error": "File not found"}, status=404)

    try:
        if path.lower().endswith(".pdf"):
            import re
            try:
                p_num = int(re.search(r"(\d+)", str(page)).group(1))
            except:
                p_num = 1
                
            try:
                subprocess.Popen(["evince", "-i", str(p_num), path])
            except:
                try:
                    subprocess.Popen(["okular", "-p", str(p_num), path])
                except:
                    subprocess.Popen(["xdg-open", path])
        else:
            subprocess.Popen(["xdg-open", path])
            
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def voice_capture(request):
    """Semantically route a voice transcript to the right wiki page."""
    transcript = request.data.get("transcript", "").strip()
    if not transcript:
        return Response({"error": "No transcript provided"}, status=400)
    
    # 1. Find the best matching page
    matches = semantic_index.search(transcript, top_k=1)
    
    if matches and matches[0][1] > 0.6:
        target_page = matches[0][0]
        wiki_dir = WORKSPACE_WIKI_DIR
        file_path = wiki_dir / f"{target_page.replace(' ', '_')}.md"
        
        if file_path.exists():
            current_content = file_path.read_text(encoding="utf-8")
            # Append as a thought
            new_content = current_content + f"\n\n---\n> 🎙️ **Voice Thought ({time.strftime('%Y-%m-%d %H:%M')})**\n> {transcript}"
            file_path.write_text(new_content, encoding="utf-8")
            
            # Git commit
            try:
                repo = Repo(wiki_dir)
                repo.git.add(str(file_path))
                repo.index.commit(f"Voice Capture: Appended thought to [[{target_page}]]")
            except: pass
            
            return Response({"status": "appended", "page": target_page})
    
    # 2. If no good match, create a new "Unfiled Thoughts" page or a new page
    result = ingest_processor.process_text(transcript, title="New Thought", auto_approve=True)
    return Response({"status": "created", "result": result})

@api_view(["POST"])
def publish_wiki(request):
    """Generate a standalone, sleek HTML documentation site from the wiki."""
    wiki_dir = WORKSPACE_WIKI_DIR
    files = list(wiki_dir.glob("*.md"))
    
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Memos Public Documentation</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
            :root { --bg: #050505; --text: #e0e0e0; --accent: #00ffcc; --card: #111; --border: #222; }
            body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; margin: 0; padding: 0; }
            .container { max-width: 900px; margin: 0 auto; padding: 4rem 2rem; }
            header { border-bottom: 1px solid var(--border); padding-bottom: 2rem; margin-bottom: 4rem; }
            h1 { font-weight: 800; font-size: 3rem; margin: 0; color: #fff; letter-spacing: -0.04em; }
            .page-card { background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 2rem; margin-bottom: 3rem; }
            h2 { color: var(--accent); font-size: 1.5rem; margin-top: 0; }
            .content { font-size: 1.05rem; color: #ccc; }
            pre { background: #000; padding: 1rem; border-radius: 12px; overflow-x: auto; border: 1px solid #333; }
            code { font-family: monospace; color: var(--accent); }
            a { color: var(--accent); text-decoration: none; }
            a:hover { text-decoration: underline; }
            nav { position: sticky; top: 0; background: rgba(5,5,5,0.8); backdrop-filter: blur(10px); padding: 1rem 0; border-bottom: 1px solid var(--border); z-index: 100; }
            .nav-inner { max-width: 900px; margin: 0 auto; display: flex; gap: 1rem; overflow-x: auto; }
            .nav-link { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: #666; white-space: nowrap; }
        </style>
    </head>
    <body>
        <nav><div class="nav-inner">
    """
    
    # Navigation
    for f in files:
        title = f.stem.replace("_", " ")
        html_content += f'<a href="#{f.stem}" class="nav-link">{title}</a>'
    
    html_content += """
        </div></nav>
        <div class="container">
            <header>
                <h1>Knowledge Base</h1>
                <p style="color: #666;">Generated by MemOS OpenClaw on """ + time.strftime("%Y-%m-%d") + """</p>
            </header>
    """
    
    import markdown
    for f in files:
        title = f.stem.replace("_", " ")
        content = f.read_text(encoding="utf-8")
        # Strip frontmatter
        content = re.sub(r"---.*?---", "", content, flags=re.DOTALL)
        body_html = markdown.markdown(content)
        
        html_content += f"""
        <div class="page-card" id="{f.stem}">
            <h2>{title}</h2>
            <div class="content">{body_html}</div>
        </div>
        """
        
    html_content += """
        </div>
    </body>
    </html>
    """
    
    # Save to a public file or return as response
    output_path = WORKSPACE_ROOT / "published_docs.html"
    output_path.write_text(html_content, encoding="utf-8")
    
    return Response({"status": "published", "url": str(output_path)})

@api_view(["GET"])
def manage_sources(request):
    """List ingested sources (reliability scoring removed)."""
    sources = Source.objects.all().order_by('-created_at')
    latest_by_source = {}
    for ledger in RawArtifactLedger.objects.select_related("source").order_by("-ingested_at"):
        latest_by_source.setdefault(ledger.source_id, ledger)
    return Response({
        "sources": [
            {
                "id": s.id,
                "name": s.name,
                "type": s.source_type,
                "created_at": s.created_at.isoformat(),
                "canonical_path": (latest_by_source.get(s.id).canonical_path if latest_by_source.get(s.id) else s.path_or_url),
                "mime_type": (latest_by_source.get(s.id).mime_type if latest_by_source.get(s.id) else ""),
                "sha256": (latest_by_source.get(s.id).sha256 if latest_by_source.get(s.id) else ""),
                "ingested_at": (
                    latest_by_source.get(s.id).ingested_at.isoformat()
                    if latest_by_source.get(s.id)
                    else s.created_at.isoformat()
                ),
            } for s in sources
        ]
    })


# ------------------------------------------------------------------------------
# Installation & Onboarding Setup
# ------------------------------------------------------------------------------

@api_view(["GET"])
def get_setup_status(request):
    """Check whether setup is complete and local workspace is usable."""
    is_activated = bool(getattr(settings, 'MEMOS_LICENSE_KEY', ''))
    workspace_root = WORKSPACE_ROOT
    wiki_dir = workspace_root / "wiki"
    raw_dir = workspace_root / "raw"
    workspace_ready = wiki_dir.exists() and raw_dir.exists()

    return Response({
        "is_activated": is_activated,
        "workspace_ready": workspace_ready,
        "is_fully_setup": is_activated and workspace_ready,
    })

@api_view(["POST"])
def setup_activate(request):
    """Verify and save the Activation License Key."""
    license_key = request.data.get("license_key")
    
    if not license_key:
        return Response({"valid": False, "error": "Activation key required."}, status=400)
    
    # MOCK SAAS LOGIC
    if license_key.startswith("REVOKED-"):
        return Response({"valid": False, "error": "Subscription expired or payment failed."})
        
    if not license_key.startswith("MEM-"):
        return Response({"valid": False, "error": "Invalid Activation Key."})
        
    # Valid Key - Save it
    env_path = Path(settings.BASE_DIR) / ".env"
    env_lines = []
    if env_path.exists():
        env_lines = env_path.read_text().splitlines()
    
    new_lines = []
    found_license = False
    for line in env_lines:
        if line.startswith("MEMOS_LICENSE_KEY="):
            new_lines.append(f"MEMOS_LICENSE_KEY={license_key}")
            found_license = True
        elif line.startswith("GROQ_API_KEY=") or line.startswith("MEMOS_SETUP_MODE="):
            continue # Strip out old local configs
        else:
            new_lines.append(line)

    if not found_license:
        new_lines.append(f"MEMOS_LICENSE_KEY={license_key}")
        
    env_path.write_text("\n".join(new_lines) + "\n")
    
    # Reload settings
    settings.MEMOS_LICENSE_KEY = license_key
    
    # Reload AI Client
    from .ai_client import MemosAIClient
    import ingest.ai_client as ac_module
    ac_module.memos_ai = MemosAIClient()

    # Ensure local workspace directories exist for deterministic startup.
    workspace_root = WORKSPACE_ROOT
    (workspace_root / "wiki").mkdir(parents=True, exist_ok=True)
    (workspace_root / "raw").mkdir(parents=True, exist_ok=True)
    _append_metric_event("setup_activate_success", {"is_activated": True})
    
    return Response({"valid": True, "status": "success"})


@api_view(["POST"])
def track_metric_event(request):
    """Track frontend KPI events into local workspace logs."""
    event_name = str(request.data.get("event", "")).strip()
    if not event_name:
        return Response({"error": "event is required"}, status=400)
    payload = request.data.get("payload", {})
    if not isinstance(payload, dict):
        payload = {"value": str(payload)}
    _append_metric_event(event_name, payload)
    return Response({"status": "tracked"}, status=200)


@api_view(["GET"])
def get_metrics_summary(request):
    """Return lightweight KPI event counts for MVP validation."""
    workspace_root = WORKSPACE_ROOT
    events_file = workspace_root / "_metrics" / "events.jsonl"
    counts = {}
    if events_file.exists():
        try:
            for line in events_file.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                event = json.loads(line).get("event", "unknown")
                counts[event] = counts.get(event, 0) + 1
        except Exception:
            pass
    return Response({"event_counts": counts}, status=200)

