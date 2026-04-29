from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from git import Repo
from django.conf import settings
from pathlib import Path

WORKSPACE_WIKI_DIR = Path(settings.WORKSPACE_WIKI_DIR)


@api_view(["POST"])
def create_snapshot(request):
    try:
        repo = Repo(WORKSPACE_WIKI_DIR)
        if repo.is_dirty():
            repo.git.add(A=True)
            commit = repo.index.commit(f"Snapshot {request.data.get('message', 'Auto snapshot')}")
            return Response({"commit": commit.hexsha, "created": True})
        return Response({"message": "No changes to snapshot"})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def list_snapshots(request):
    try:
        repo = Repo(WORKSPACE_WIKI_DIR)
        commits = list(repo.iter_commits(max_count=20))
        return Response([
            {
                "hexsha": c.hexsha[:8],
                "message": c.message[:100],
                "author": c.author.name,
                "datetime": c.committed_datetime.isoformat(),
            }
            for c in commits
        ])
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_git_history(request):
    file_path = request.query_params.get("file")
    try:
        repo = Repo(WORKSPACE_WIKI_DIR)
        if file_path:
            commits = list(repo.iter_commits(paths=file_path, max_count=20))
        else:
            commits = list(repo.iter_commits(max_count=20))
        return Response([
            {
                "hexsha": c.hexsha[:8],
                "message": c.message[:100],
                "datetime": c.committed_datetime.isoformat(),
            }
            for c in commits
        ])
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def list_pull_requests(request):
    try:
        repo = Repo(WORKSPACE_WIKI_DIR)
        return Response({"prs": []})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_pull_request_diff(request):
    pr_id = request.query_params.get("pr_id")
    if not pr_id:
        return Response({"error": "pr_id required"}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"diff": ""})


@api_view(["POST"])
def revert_version(request):
    commit_sha = request.data.get("commit_sha")
    if not commit_sha:
        return Response({"error": "commit_sha required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        repo = Repo(WORKSPACE_WIKI_DIR)
        repo.git.reset("--hard", commit_sha)
        return Response({"reverted": True})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
