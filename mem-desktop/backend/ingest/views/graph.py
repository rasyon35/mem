from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(["POST"])
def node_context(request):
    node_id = request.data.get("node_id")
    if not node_id:
        return Response({"error": "node_id required"}, status=status.HTTP_400_BAD_REQUEST)

    from ..graph_service import graph_service
    context = graph_service.get_node_context(node_id)

    return Response(context)


@api_view(["GET"])
def related_nodes(request):
    node_id = request.query_params.get("node_id")
    if not node_id:
        return Response({"error": "node_id required"}, status=status.HTTP_400_BAD_REQUEST)

    from ..graph_service import graph_service
    nodes = graph_service.get_related_nodes(node_id)

    return Response({"nodes": nodes})


@api_view(["GET"])
def path_between(request):
    node_a = request.query_params.get("node_a")
    node_b = request.query_params.get("node_b")
    if not node_a or not node_b:
        return Response({"error": "node_a and node_b required"}, status=status.HTTP_400_BAD_REQUEST)

    from ..graph_service import graph_service
    path = graph_service.find_path(node_a, node_b)

    return Response({"path": path})
