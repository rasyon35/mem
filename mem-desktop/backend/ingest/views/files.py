from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from pathlib import Path

WORKSPACE_WIKI_DIR = Path(settings.WORKSPACE_WIKI_DIR)


@api_view(["POST"])
def open_source_file(request):
    file_path = request.data.get("file_path")
    if not file_path:
        return Response({"error": "file_path required"}, status=status.HTTP_400_BAD_REQUEST)
    full_path = WORKSPACE_WIKI_DIR / file_path
    if not full_path.exists():
        return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
    content = full_path.read_text()
    return Response({"content": content, "path": file_path})


@api_view(["POST"])
def publish_wiki(request):
    try:
        from ..wiki_context import wiki_context
        result = wiki_context.publish()
        return Response({"published": True, "result": result})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
