from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
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
    """
    question = request.data.get("question", "").strip()
    if not question:
        return Response(
            {"error": "No question provided"}, status=status.HTTP_400_BAD_REQUEST
        )

    # Retrieve relevant wiki context
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
    """Return all wiki page titles and a short description"""
    pages = []
    wiki_dir = Path(settings.BASE_DIR).parent / "workspace" / "wiki"
    if wiki_dir.exists():
        for md_file in sorted(wiki_dir.glob("*.md")):
            if md_file.name in ("index.md", "log.md"):
                continue
            content = md_file.read_text(encoding="utf-8")
            desc = ""
            for line in content.splitlines():
                if line.startswith("# ") and len(line) > 2:
                    desc = line[2:].strip()[:120]
                    break
            pages.append({"title": md_file.stem, "description": desc})

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
