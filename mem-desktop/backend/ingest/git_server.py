import os
import subprocess
from django.http import HttpResponse, StreamingHttpResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from pathlib import Path

# Paths to the git executable and the http-backend binary
GIT_HTTP_BACKEND = "/usr/lib/git-core/git-http-backend"

@csrf_exempt
def git_hub_view(request, repo_name):
    """
    A Django view that proxies requests to git-http-backend.
    This allows Mem to act as a Git server over HTTP.
    
    URL should look like: /git/<repo_name>/info/refs, /git/<repo_name>/git-receive-pack, etc.
    """
    workspace_root = Path(settings.WORKSPACE_ROOT)
    project_root = Path(settings.WORKSPACE_WIKI_DIR)  # For now, we only serve the wiki
    
    # Security: In a more advanced version, we'd check an 'Authorization' header here
    # against a token stored in the database or team.json.
    # For now, let's keep it simple for the user to get started.

    if not project_root.exists():
        return HttpResponse(f"Repository {repo_name} not found", status=404)

    # Prepare environment for git-http-backend
    # We strip the /git/<repo_name> prefix from the path to get the git-specific part
    path_info = request.path_info
    git_path = path_info.split(f"/git/{repo_name}", 1)[-1]
    
    env = {
        "GIT_PROJECT_ROOT": str(workspace_root),
        "GIT_HTTP_EXPORT_ALL": "1",
        "PATH_INFO": git_path,
        "REMOTE_USER": request.META.get("REMOTE_USER", "mem_user"),
        "REMOTE_ADDR": request.META.get("REMOTE_ADDR", ""),
        "QUERY_STRING": request.META.get("QUERY_STRING", ""),
        "REQUEST_METHOD": request.method,
        "CONTENT_TYPE": request.META.get("CONTENT_TYPE", ""),
    }

    # Prepare subprocess call
    process = subprocess.Popen(
        [GIT_HTTP_BACKEND],
        env=env,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # If it's a POST, we need to pipe the request body to stdin
    if request.method == "POST":
        input_data = request.body
        process.stdin.write(input_data)
    
    process.stdin.close()

    # Read output (headers + body)
    # git-http-backend outputs CGI style headers followed by the body
    output = process.stdout.read()
    err = process.stderr.read()
    
    if process.wait() != 0:
        print(f"Git HTTP Backend Error: {err.decode()}")
        return HttpResponse(f"Internal Git Error: {err.decode()}", status=500)

    # Parse headers from output
    header_block, body = output.split(b"\r\n\r\n", 1)
    django_response = HttpResponse(body)
    
    for line in header_block.split(b"\r\n"):
        if b":" in line:
            key, value = line.split(b":", 1)
            django_response[key.decode().strip()] = value.decode().strip()

    return django_response
