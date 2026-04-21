import os
import io
import zipfile
from pathlib import Path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import HttpResponse
from django.conf import settings
from xhtml2pdf import pisa
import markdown

WIKI_DIR = Path(settings.BASE_DIR).parent / "workspace" / "wiki"

def convert_md_to_pdf(md_content, title):
    # Convert markdown to HTML
    html_body = markdown.markdown(md_content, extensions=['fenced_code', 'tables'])
    
    # CSS styling for the PDF to make it look decent
    html_string = f"""
    <html>
    <head>
    <style>
        body {{ font-family: Helvetica, Arial, sans-serif; font-size: 11pt; color: #333; line-height: 1.5; }}
        h1 {{ color: #6c63ff; font-size: 20pt; border-bottom: 2px solid #eaebec; padding-bottom: 8px; margin-bottom: 20px; }}
        h2 {{ color: #2c3e50; font-size: 16pt; margin-top: 20px; }}
        h3 {{ color: #34495e; font-size: 14pt; }}
        p {{ margin-bottom: 12px; }}
        code {{ background-color: #f8f9fa; padding: 2px 4px; border: 1px solid #eaebec; font-family: Courier, monospace; font-size: 10pt; }}
        pre {{ background-color: #f8f9fa; padding: 12px; border: 1px solid #eaebec; font-family: Courier, monospace; white-space: pre-wrap; font-size: 10pt; border-radius: 4px; }}
        table {{ border-collapse: collapse; width: 100%; margin-bottom: 15px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; }}
        th {{ background-color: #f2f2f2; text-align: left; font-weight: bold; }}
        blockquote {{ border-left: 4px solid #6c63ff; margin-left: 0; padding-left: 15px; color: #666; font-style: italic; }}
    </style>
    </head>
    <body>
    <h1>{title.replace('_', ' ')}</h1>
    {html_body}
    </body>
    </html>
    """
    
    result = io.BytesIO()
    pdf = pisa.pisaDocument(io.BytesIO(html_string.encode("utf-8")), result)
    
    if not pdf.err:
        result.seek(0)
        return result
    return None

@api_view(["GET"])
def export_page(request):
    """
    Export a single page as PDF or Markdown.
    Query params:
        - page: The title of the page
        - format: 'pdf' or 'md' (default 'pdf')
    """
    page_title = request.query_params.get("page")
    export_format = request.query_params.get("format", "pdf").lower()
    
    if not page_title:
        return Response({"error": "No page title provided"}, status=400)
        
    slug = page_title.replace(" ", "_")
    file_path = WIKI_DIR / f"{slug}.md"
    
    if not file_path.exists():
        return Response({"error": "Page not found"}, status=404)
        
    md_content = file_path.read_text(encoding="utf-8")
    
    if export_format == "md":
        response = HttpResponse(md_content, content_type="text/markdown")
        response['Content-Disposition'] = f'attachment; filename="{slug}.md"'
        return response
    else:
        pdf_file = convert_md_to_pdf(md_content, page_title)
        if pdf_file:
            response = HttpResponse(pdf_file.read(), content_type="application/pdf")
            response['Content-Disposition'] = f'attachment; filename="{slug}.pdf"'
            return response
        else:
            return Response({"error": "Failed to generate PDF"}, status=500)


@api_view(["GET"])
def export_all(request):
    """
    Export the entire wiki to a ZIP bundle containing markdown and a compiled PDF.
    """
    if not WIKI_DIR.exists():
        return Response({"error": "Wiki directory not found"}, status=404)
        
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(WIKI_DIR):
            for file in files:
                if file.endswith(".md"):
                    file_path = os.path.join(root, file)
                    # Add to zip bundle
                    zip_file.write(file_path, arcname=f"markdown/{file}")
                    
    zip_buffer.seek(0)
    response = HttpResponse(zip_buffer.read(), content_type="application/zip")
    response['Content-Disposition'] = 'attachment; filename="mem_knowledge_base.zip"'
    return response
