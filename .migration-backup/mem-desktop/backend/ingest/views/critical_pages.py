from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils.text import slugify


@api_view(["GET", "POST", "DELETE"])
def manage_critical_pages(request):
    if request.method == "GET":
        return Response({"critical_pages": []})
    elif request.method == "POST":
        page_slug = request.data.get("slug")
        return Response({"added": True, "slug": page_slug})
    elif request.method == "DELETE":
        page_slug = request.query_params.get("slug")
        return Response({"removed": True, "slug": page_slug})
