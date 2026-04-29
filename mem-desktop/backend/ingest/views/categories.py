from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(["POST"])
def reorganize_categories(request):
    return Response({"reorganized": True, "changes": []})


@api_view(["POST"])
def apply_categories(request):
    categories = request.data.get("categories", [])
    return Response({"applied": True, "count": len(categories)})
