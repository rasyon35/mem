from rest_framework.decorators import api_view
from rest_framework.response import Response
import os
from pathlib import Path
from django.conf import settings

@api_view(['GET'])
def health(request):
    return Response({'status': 'ok', 'message': 'Mem backend is running'})

@api_view(['GET'])
def workspace_info(request):
    workspace_root = Path(settings.WORKSPACE_ROOT)
    workspace_root.mkdir(exist_ok=True)
    raw_dir = Path(settings.WORKSPACE_RAW_DIR)
    wiki_dir = Path(settings.WORKSPACE_WIKI_DIR)
    raw_dir.mkdir(exist_ok=True)
    wiki_dir.mkdir(exist_ok=True)
    return Response({
        'workspace_path': str(workspace_root),
        'raw_path': str(raw_dir),
        'wiki_path': str(wiki_dir)
    })

