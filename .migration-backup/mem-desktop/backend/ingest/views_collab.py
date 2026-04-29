import json
import time
from django.conf import settings
from pathlib import Path
from git import Repo
from rest_framework.decorators import api_view
from rest_framework.response import Response

WORKSPACE_WIKI_DIR = Path(settings.WORKSPACE_WIKI_DIR)


@api_view(["GET", "POST"])
def manage_team(request):
    wiki_dir = WORKSPACE_WIKI_DIR
    team_file = wiki_dir / "_config" / "team.json"
    team_file.parent.mkdir(parents=True, exist_ok=True)

    if request.method == "GET":
        if team_file.exists():
            try:
                return Response(json.loads(team_file.read_text()), status=200)
            except Exception:
                pass
        return Response({"admins": [], "editors": [], "contributors": [], "viewers": []}, status=200)

    data = request.data
    team_file.write_text(json.dumps(data, indent=2))
    return Response({"status": "updated"}, status=200)


@api_view(["GET", "POST"])
def manage_locks(request):
    wiki_dir = WORKSPACE_WIKI_DIR
    locks_dir = wiki_dir / "_locks"
    locks_dir.mkdir(parents=True, exist_ok=True)

    if request.method == "GET":
        locks = []
        for lock_file in locks_dir.glob("*.lock"):
            try:
                locks.append(
                    {
                        "page": lock_file.stem,
                        "owner": lock_file.read_text().strip(),
                        "timestamp": lock_file.stat().st_mtime,
                    }
                )
            except Exception:
                pass
        return Response({"locks": locks}, status=200)

    page = request.data.get("page")
    force = request.data.get("force", False)
    action = request.data.get("action")
    user = request.data.get("user", "unknown")
    lock_file = locks_dir / f"{page}.lock"

    if action == "lock":
        if lock_file.exists() and not force:
            owner = lock_file.read_text().strip()
            if owner != user:
                return Response({"error": "Already locked", "owner": owner}, status=409)
        lock_file.write_text(user)
        return Response({"status": "locked", "owner": user}, status=200)

    if action == "unlock":
        if lock_file.exists():
            owner = lock_file.read_text().strip()
            if owner != user and not force:
                return Response({"error": "Cannot unlock page owned by another user", "owner": owner}, status=403)
            lock_file.unlink()
        return Response({"status": "unlocked"}, status=200)

    return Response({"error": "Invalid action"}, status=400)


@api_view(["GET"])
def sync_status(request):
    wiki_dir = WORKSPACE_WIKI_DIR
    try:
        repo = Repo(wiki_dir)
        if not repo.remotes:
            return Response({"status": "no_remote"}, status=200)

        try:
            repo.remotes.origin.fetch()
        except Exception:
            pass

        remote_ref = None
        main_branch = None
        for branch in ["main", "master"]:
            if branch in repo.heads:
                main_branch = branch
                remote_name = f"origin/{branch}"
                if remote_name in [ref.name for ref in repo.remotes.origin.refs]:
                    remote_ref = repo.remotes.origin.refs[branch].commit
                    break

        if not remote_ref:
            return Response(
                {"status": "no_remote_branch", "message": "Remote exists but target branch (main/master) not found"},
                status=200,
            )

        diff_behind = list(repo.iter_commits(f"{main_branch}..origin/{main_branch}"))
        diff_ahead = list(repo.iter_commits(f"origin/{main_branch}..{main_branch}"))
        is_behind = len(diff_behind) > 0
        is_ahead = len(diff_ahead) > 0

        return Response(
            {
                "status": "diverged" if is_behind and is_ahead else ("behind" if is_behind else ("ahead" if is_ahead else "synced")),
                "behind_by": len(diff_behind),
                "ahead_by": len(diff_ahead),
                "remote_url": repo.remotes.origin.url,
                "branch": main_branch,
            },
            status=200,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_git_conflicts(request):
    wiki_dir = WORKSPACE_WIKI_DIR
    try:
        repo = Repo(wiki_dir)
        unmerged = repo.index.unmerged_blobs()
        conflicts = []
        for filename, blobs in unmerged.items():
            conflict_data = {"filename": filename, "ours": "", "theirs": "", "base": ""}
            for stage, blob in blobs:
                try:
                    content = blob.data_stream.read().decode("utf-8")
                    if stage == 1:
                        conflict_data["base"] = content
                    if stage == 2:
                        conflict_data["ours"] = content
                    if stage == 3:
                        conflict_data["theirs"] = content
                except Exception:
                    pass
            conflicts.append(conflict_data)
        return Response({"conflicts": conflicts}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def resolve_conflict(request):
    filename = request.data.get("filename")
    action = request.data.get("action")
    content = request.data.get("content")
    wiki_dir = WORKSPACE_WIKI_DIR
    try:
        repo = Repo(wiki_dir)
        if action == "ours":
            repo.git.checkout("--ours", filename)
        elif action == "theirs":
            repo.git.checkout("--theirs", filename)
        elif action == "merged":
            filepath = wiki_dir / filename
            filepath.write_text(content, encoding="utf-8")
            repo.index.add([filename])

        repo.index.add([filename])
        if not repo.index.unmerged_blobs():
            try:
                repo.index.commit("Resolved merge conflicts via Mem Visual Merge Tool")
            except Exception:
                pass
        return Response({"status": "resolved"}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def track_activity(request):
    page = request.data.get("page")
    user = request.data.get("user", "Anonymous")
    wiki_dir = WORKSPACE_WIKI_DIR
    activity_dir = wiki_dir / "_activity"
    activity_dir.mkdir(parents=True, exist_ok=True)
    activity_file = activity_dir / f"{page}.activity"
    try:
        activity_data = {"user": user, "timestamp": time.time()}
        activity_file.write_text(json.dumps(activity_data))
        return Response({"status": "tracked"}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_presence(request):
    wiki_dir = WORKSPACE_WIKI_DIR
    activity_dir = wiki_dir / "_activity"
    presence = {}
    now = time.time()
    if activity_dir.exists():
        for act_file in activity_dir.glob("*.activity"):
            try:
                data = json.loads(act_file.read_text())
                if now - data.get("timestamp", 0) < 60:
                    presence[act_file.stem] = {
                        "user": data.get("user", "Anonymous"),
                        "last_seen": data.get("timestamp", 0),
                    }
            except Exception:
                if now - act_file.stat().st_mtime > 300:
                    try:
                        act_file.unlink()
                    except Exception:
                        pass
    return Response({"presence": presence}, status=200)
