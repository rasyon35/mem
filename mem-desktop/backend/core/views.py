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
    workspace_root = Path(settings.BASE_DIR).parent / 'workspace'
    workspace_root.mkdir(exist_ok=True)
    raw_dir = workspace_root / 'raw'
    wiki_dir = workspace_root / 'wiki'
    raw_dir.mkdir(exist_ok=True)
    wiki_dir.mkdir(exist_ok=True)
    return Response({
        'workspace_path': str(workspace_root),
        'raw_path': str(raw_dir),
        'wiki_path': str(wiki_dir)
    })

@api_view(['GET'])
def list_pages(request):
    workspace_root = Path(settings.BASE_DIR).parent / 'workspace'
    wiki_dir = workspace_root / 'wiki'
    if not wiki_dir.exists():
        return Response({'pages': []})
    pages = [f.name for f in wiki_dir.glob('*.md')]
    return Response({'pages': pages})
