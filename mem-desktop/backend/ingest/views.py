from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .extractors import TextExtractor
import os
from pathlib import Path
from django.conf import settings

@api_view(['POST'])
def ingest_file(request):
    """Accept a file upload or a URL, extract text, and queue for LLM processing"""
    workspace_root = Path(settings.BASE_DIR).parent / 'workspace'
    raw_dir = workspace_root / 'raw'
    raw_dir.mkdir(parents=True, exist_ok=True)

    # Handle file upload
    if 'file' in request.FILES:
        uploaded_file = request.FILES['file']
        # Save to raw/ folder first
        file_path = raw_dir / uploaded_file.name
        with open(file_path, 'wb') as f:
            for chunk in uploaded_file.chunks():
                f.write(chunk)
        # Extract text
        text, file_type = TextExtractor.extract(file_path)
        return Response({
            'status': 'extracted',
            'file_path': str(file_path),
            'file_type': file_type,
            'preview': text[:500],  # first 500 chars for UI preview
            'full_text_length': len(text)
        })

    # Handle URL
    elif 'url' in request.data:
        url = request.data['url']
        text, source_type = TextExtractor.extract(url)
        # Save a copy of the page as markdown in raw/
        from urllib.parse import urlparse
        domain = urlparse(url).netloc.replace('.', '_')
        filename = f"web_{domain}_{hash(url) % 10000}.md"
        file_path = raw_dir / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(f"# Source: {url}\n\n{text}")
        return Response({
            'status': 'extracted',
            'url': url,
            'file_path': str(file_path),
            'preview': text[:500],
            'full_text_length': len(text)
        })

    return Response({'error': 'No file or URL provided'}, status=status.HTTP_400_BAD_REQUEST)
