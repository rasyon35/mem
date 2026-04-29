from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import WorkspacePage, PageLink


@api_view(["GET"])
def knowledge_graph(request):
    pages = WorkspacePage.objects.filter(status="active").select_related("topic")
    links = PageLink.objects.all().select_related("from_page", "to_page")

    nodes = []
    seen = set()
    for page in pages:
        if page.id in seen:
            continue
        seen.add(page.id)
        nodes.append({
            "id": str(page.id),
            "label": page.title,
            "type": "page",
            "topic": page.topic.name if page.topic else "Uncategorized",
            "page_type": page.page_type,
        })

    edges = []
    for link in links:
        edges.append({
            "source": str(link.from_page_id),
            "target": str(link.to_page_id),
            "label": link.link_text,
        })

    return Response({
        "nodes": nodes,
        "edges": edges,
    })
