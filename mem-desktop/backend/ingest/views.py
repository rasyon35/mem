from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from django.conf import settings
from git import Repo

from .extractors import TextExtractor
from .processor import ingest_processor
from .wiki_context import wiki_context
from .groq_client import groq_client
from .models import Source, Contradiction, CriticalPage


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
    workspace_root = Path(settings.BASE_DIR).parent / "workspace"
    raw_dir = workspace_root / "raw"
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
        return Response(result, status=status.HTTP_200_OK)

    # --- URL ---
    if "url" in request.data:
        url = request.data["url"]
        try:
            text, _ = TextExtractor.extract(url)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        domain = urlparse(url).netloc.replace(".", "_")
        filename = f"web_{domain}_{abs(hash(url)) % 100000}.md"
        file_path = raw_dir / filename
        file_path.write_text(f"# Source: {url}\n\n{text}", encoding="utf-8")

        result = ingest_processor.process_file(file_path, auto_approve=auto_approve)
        return Response(result, status=status.HTTP_200_OK)

    return Response(
        {"error": "No file or URL provided"}, status=status.HTTP_400_BAD_REQUEST
    )


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

    result = ingest_processor.apply_changes(staged)
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

    context = ""
    if page_title:
        # Priority 1: Read the full current page content
        current_page = wiki_context.get_page(page_title)
        if current_page:
            context += f"\n## CURRENT PAGE: [[{page_title}]]\n{current_page}\n---\n"

            # Priority 2: Find linked pages via [[Page Name]] syntax and include them
            import re as _re
            linked_titles = _re.findall(r"\[\[([^\]]+)\]\]", current_page)
            for linked_title in linked_titles[:5]:
                linked_content = wiki_context.get_page(linked_title)
                if linked_content:
                    context += f"\n## RELATED: [[{linked_title}]]\n{linked_content[:800]}\n---\n"

        # Priority 3: Also do a keyword search for the question itself
        extra = wiki_context.search_pages(question, max_pages=3)
        if extra:
            context += f"\n{extra}"
    else:
        # No page context – fall back to keyword search (main chat page behavior)
        context = wiki_context.search_pages(question, max_pages=6)
        if not context:
            context = wiki_context.get_index()

    answer = groq_client.answer_question(question, wiki_pages_content=context)
    return Response({"answer": answer}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Wiki listing (for sidebar / explorer)
# ---------------------------------------------------------------------------

@api_view(["GET"])
def list_wiki_pages(request):
    """Return all wiki page titles, properties, and a short description"""
    pages = []
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    if wiki_dir.exists():
        for md_file in sorted(wiki_dir.glob("*.md")):
            if md_file.name in ("index.md", "log.md"):
                continue
            content = md_file.read_text(encoding="utf-8")
            
            desc = ""
            page_type = "concept"
            page_category = "Miscellaneous"
            
            # Extract category
            cat_match = re.search(r"^category:\s*(.+)$", content, re.MULTILINE)
            if cat_match:
                page_category = cat_match.group(1).strip().strip("'").strip('"')
            
            # Extract type
            type_match = re.search(r"^type:\s*(.+)$", content, re.MULTILINE)
            if type_match:
                nt = type_match.group(1).strip().lower()
                page_type = nt.strip("'").strip('"')
            else:
                if md_file.stem.lower().startswith("source_") or "Source: " in content:
                    page_type = "source"
                elif any(x in md_file.stem.lower() for x in ["person", "org", "place", "event"]):
                    page_type = "entity"

            for line in content.splitlines():
                if line.startswith("# ") and len(line) > 2:
                    desc = line[2:].strip()[:120]
                    break
            pages.append({"title": md_file.stem, "description": desc, "type": page_type, "category": page_category})

    return Response({"pages": pages}, status=status.HTTP_200_OK)


@api_view(["GET"])
def get_wiki_page(request, title):
    """Return the full markdown content of a single wiki page"""
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    slug = title.replace(" ", "_")
    path = wiki_dir / f"{slug}.md"

    if not path.exists():
        return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

    content = path.read_text(encoding="utf-8")
    return Response({"title": title, "content": content}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# History & Git
# ---------------------------------------------------------------------------

@api_view(["GET"])
def get_git_history(request):
    """Return the recent git commit history, optionally filtered by page"""
    page = request.query_params.get("page")
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
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


@api_view(["POST"])
def revert_version(request):
    """Revert the wiki to a specific commit hash"""
    commit_hash = request.data.get("commit_hash")
    if not commit_hash:
        return Response({"error": "No commit hash provided"}, status=status.HTTP_400_BAD_REQUEST)

    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    try:
        repo = Repo(wiki_dir)
        # We do a revert by checking out the files and then committing that state
        repo.git.checkout(commit_hash, ".")
        repo.index.add(["."])
        repo.index.commit(f"revert to {commit_hash[:7]}")

        # Trigger an index rebuild after revert
        ingest_processor._rebuild_index()

        return Response({"status": "reverted", "message": f"Wiki reverted to {commit_hash[:7]}"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"Revert failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Management: Contradictions & Critical Pages
# ---------------------------------------------------------------------------

@api_view(["GET", "POST", "DELETE"])
def manage_critical_pages(request):
    """Manage critical pages via the _config/critical_pages.txt file"""
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
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
        action = request.data.get("action") # 'accept' or 'dismiss'
        try:
            c = Contradiction.objects.get(id=c_id)
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


# ---------------------------------------------------------------------------
# Phase 4: Team Collaboration
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
def manage_team(request):
    """Get or update team roles from _config/team.json"""
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    team_file = wiki_dir / "_config" / "team.json"
    team_file.parent.mkdir(parents=True, exist_ok=True)

    if request.method == "GET":
        if team_file.exists():
            try:
                return Response(json.loads(team_file.read_text()), status=200)
            except Exception:
                pass
        return Response({"admins": [], "editors": [], "contributors": [], "viewers": []}, status=200)

    if request.method == "POST":
        # Only admins can update (logic simplified for now)
        data = request.data
        team_file.write_text(json.dumps(data, indent=2))
        return Response({"status": "updated"}, status=200)


@api_view(["GET", "POST"])
def manage_locks(request):
    """Manage local locks for pages"""
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    locks_dir = wiki_dir / "_locks"
    locks_dir.mkdir(parents=True, exist_ok=True)

    if request.method == "GET":
        locks = []
        for lock_file in locks_dir.glob("*.lock"):
            try:
                locks.append({
                    "page": lock_file.stem,
                    "owner": lock_file.read_text().strip(),
                    "timestamp": lock_file.stat().st_mtime
                })
            except Exception:
                pass
        return Response({"locks": locks}, status=200)

    if request.method == "POST":
        page = request.data.get("page")
        force = request.data.get("force", False)
        action = request.data.get("action") # 'lock', 'unlock'
        user = request.data.get("user", "unknown")
        
        lock_file = locks_dir / f"{page}.lock"
        
        if action == "lock":
            if lock_file.exists() and not force:
                return Response({"error": "Already locked", "owner": lock_file.read_text().strip()}, status=409)
            lock_file.write_text(user)
            return Response({"status": "locked"}, status=200)
            
        if action == "unlock":
            if lock_file.exists():
                lock_file.unlink()
            return Response({"status": "unlocked"}, status=200)
        
        return Response({"error": "Invalid action"}, status=400)


@api_view(["GET"])
def sync_status(request):
    """Check if local wiki is ahead/behind remote"""
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    try:
        repo = Repo(wiki_dir)
        if not repo.remotes:
            return Response({"status": "no_remote"}, status=200)
        
        # Try to fetch
        try:
            repo.remotes.origin.fetch()
        except Exception:
            # might have no network
            pass
        
        local_ref = repo.head.commit
        
        # Determine remote branch (master or main)
        remote_ref = None
        for branch in ['master', 'main']:
            if branch in repo.remotes.origin.refs:
                remote_ref = repo.remotes.origin.refs[branch].commit
                break

        if not remote_ref:
            return Response({"status": "synced", "message": "Remote exists but has no branch info"}, status=200)

        is_behind = repo.is_ancestor(local_ref, remote_ref) and local_ref != remote_ref
        is_ahead = repo.is_ancestor(remote_ref, local_ref) and local_ref != remote_ref

        return Response({
            "status": "diverged" if is_behind and is_ahead else ("behind" if is_behind else ("ahead" if is_ahead else "synced")),
            "behind_by": 1 if is_behind else 0,
            "ahead_by": 1 if is_ahead else 0,
            "remote_url": repo.remotes.origin.url
        }, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_git_conflicts(request):
    """Return list of files that currently have git merge conflicts"""
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    try:
        repo = Repo(wiki_dir)
        unmerged = repo.index.unmerged_blobs()
        conflicts = []
        for filename, blobs in unmerged.items():
            # blobs is a list of (stage, blob)
            # stage 1: common ancestor, 2: local (ours), 3: remote (theirs)
            conflict_data = {"filename": filename, "ours": "", "theirs": "", "base": ""}
            for stage, blob in blobs:
                try:
                    content = blob.data_stream.read().decode('utf-8')
                    if stage == 1: conflict_data["base"] = content
                    if stage == 2: conflict_data["ours"] = content
                    if stage == 3: conflict_data["theirs"] = content
                except Exception:
                    pass
            conflicts.append(conflict_data)
        
        return Response({"conflicts": conflicts}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def resolve_conflict(request):
    """Resolve a conflict by choosing ours, theirs, or providing merged content"""
    filename = request.data.get("filename")
    action = request.data.get("action") # 'ours', 'theirs', 'merged'
    content = request.data.get("content")
    
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    try:
        repo = Repo(wiki_dir)
        
        if action == "ours":
            repo.git.checkout("--ours", filename)
        elif action == "theirs":
            repo.git.checkout("--theirs", filename)
        elif action == "merged":
            filepath = wiki_dir / filename
            filepath.write_text(content, encoding='utf-8')
            repo.index.add([filename])
        
        repo.index.add([filename])
        
        # If no more conflicts, check if we can finish the merge
        if not repo.index.unmerged_blobs():
            try:
                repo.index.commit("Resolved merge conflicts via Mem Visual Merge Tool")
            except Exception:
                pass # Might already be committed or nothing to commit
            
        return Response({"status": "resolved"}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def track_activity(request):
    """Heartbeat to show a user is looking at a page"""
    page = request.data.get("page")
    user = request.data.get("user", "unknown")
    
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    activity_dir = wiki_dir / "_activity"
    activity_dir.mkdir(parents=True, exist_ok=True)
    
    activity_file = activity_dir / f"{page}.activity"
    try:
        activity_file.write_text(user)
        return Response({"status": "tracked"}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_presence(request):
    """Get active users across all pages based on recent activity"""
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    activity_dir = wiki_dir / "_activity"
    presence = {}
    
    import time
    now = time.time()
    
    if activity_dir.exists():
        for act_file in activity_dir.glob("*.activity"):
            if now - act_file.stat().st_mtime < 30:
                presence[act_file.stem] = {
                    "user": act_file.read_text().strip(),
                    "last_seen": act_file.stat().st_mtime
                }
    
    return Response({"presence": presence}, status=200)

@api_view(["GET"])
def get_graph_data(request):
    """
    Build a network graph of the wiki based on [[Internal Links]].
    Returns { nodes: [...], links: [...] }
    """
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    nodes = []
    links = []
    page_to_id = {}
    
    if not wiki_dir.exists():
        return Response({"nodes": [], "links": []})

    # 1. Collect all nodes first
    all_files = list(wiki_dir.glob("*.md"))
    for i, md_file in enumerate(all_files):
        if md_file.name in ("index.md", "log.md"):
            continue
        
        title = md_file.stem
        content = md_file.read_text(encoding="utf-8")
        
        # Heuristic for node type based on frontmatter
        node_type = "concept"
        type_match = re.search(r"^type:\s*(.+)$", content, re.MULTILINE)
        if type_match:
            nt = type_match.group(1).strip().lower()
            node_type = nt.strip("'").strip('"')
        else:
            if title.lower().startswith("source_") or "Source: " in content:
                node_type = "source"
            elif any(x in title.lower() for x in ["person", "org", "place", "event"]):
                node_type = "entity"

        nodes.append({
            "id": title,
            "name": title.replace("_", " "),
            "type": node_type,
            "val": 1, # Base size, will be boosted by degree
            "summary": content[:150] + "..."
        })
        page_to_id[title] = i

    # 2. Extract links for edges
    link_pattern = re.compile(r"\[\[([^\]]+)\]\]")
    adj_list = {n["id"]: set() for n in nodes}
    
    for md_file in all_files:
        if md_file.name in ("index.md", "log.md"):
            continue
        
        source_title = md_file.stem
        content = md_file.read_text(encoding="utf-8")
        
        # 2a. Inline wikilinks
        matches = link_pattern.findall(content)
        
        for target in matches:
            target_slug = target.strip().replace(" ", "_")
            if target_slug in adj_list and target_slug != source_title:
                links.append({
                    "source": source_title,
                    "target": target_slug,
                    "type": "relates_to"
                })
                adj_list[source_title].add(target_slug)

        # 2b. Frontmatter sources
        src_match = re.search(r"^sources:\s*\[(.*?)\]", content, re.MULTILINE)
        if src_match:
            srcs_str = src_match.group(1).strip()
            if srcs_str:
                for src in srcs_str.split(","):
                    src_clean = src.strip().strip("'").strip('"')
                    if src_clean:
                        # Make a safe slug for the source
                        src_slug = src_clean.replace(" ", "_").lower()
                        # If we don't have this node yet, create an implicit source node
                        if src_slug not in adj_list:
                            nodes.append({
                                "id": src_slug,
                                "name": src_clean[:40] + ("..." if len(src_clean)>40 else ""),
                                "type": "source",
                                "val": 1,
                                "summary": f"Source document: {src_clean}"
                            })
                            adj_list[src_slug] = set()
                        
                        # Add link from concept pointing TO the source (or source pointing to concept)
                        # Let's say source -> concept as "derived_from"
                        if src_slug != source_title:
                            # To avoid duplicates if already connected
                            already_connected = False
                            for l in links:
                                if l["source"] == src_slug and l["target"] == source_title:
                                    already_connected = True
                                    break
                            
                            if not already_connected:
                                links.append({
                                    "source": src_slug,
                                    "target": source_title,
                                    "type": "provides"
                                })
                                adj_list[src_slug].add(source_title)

    # 3. Calculate PageRank (Simple Power Iteration)
    # nodes: [{id, name, type, val, degree, summary ...}]
    num_nodes = len(nodes)
    if num_nodes > 0:
        pr = {n["id"]: 1.0 / num_nodes for n in nodes}
        damping = 0.85
        for _ in range(10): # 10 iterations enough for small graphs
            new_pr = {n["id"]: (1 - damping) / num_nodes for n in nodes}
            for link in links:
                source, target = link["source"], link["target"]
                # Get outgoing count for source
                out_count = len(adj_list[source])
                if out_count > 0:
                    new_pr[target] += damping * (pr[source] / out_count)
            pr = new_pr

        # 4. Final Node Scoring and Degree Centrality
        for node in nodes:
            node_id = node["id"]
            # Incoming + Outgoing
            incoming = sum(1 for l in links if l["target"] == node_id)
            outgoing = len(adj_list[node_id])
            
            node["degree"] = incoming + outgoing
            node["pagerank"] = pr[node_id]
            # Val is used by force-graph for node size
            # Scale PageRank to a visible size
            node["val"] = 5 + (pr[node_id] * num_nodes * 10) + (node["degree"] * 1.5)
            
            # Actionable insights
            if node["degree"] == 0:
                node["is_orphan"] = True
            if incoming > 5 or (node["degree"] > 8):
                node["is_hub"] = True

    return Response({"nodes": nodes, "links": links}, status=200)


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
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
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
    import time
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
            response = groq_client.client.chat.completions.create(
                model=groq_client.model,
                messages=[
                    {"role": "system", "content": "You organize knowledge into semantic categories. Return only JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )
            chunk_result = json.loads(response.choices[0].message.content)
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

    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
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
