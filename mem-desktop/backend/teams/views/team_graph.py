from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Team, TeamMembership, TeamGraphNode, TeamGraphLink
from ..serializers import TeamGraphNodeSerializer, TeamGraphLinkSerializer
from .team_core import get_team_membership


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_graph(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        nodes = team.graph_nodes.all()
        links = team.graph_links.all()
        return Response({
            "nodes": TeamGraphNodeSerializer(nodes, many=True).data,
            "links": TeamGraphLinkSerializer(links, many=True).data,
        })

    elif request.method == "POST":
        if membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        node_data = request.data.get("node")
        if node_data:
            serializer = TeamGraphNodeSerializer(data=node_data, context={"request": request, "team": team})
            if serializer.is_valid():
                node = serializer.save()
                return Response(TeamGraphNodeSerializer(node).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        link_data = request.data.get("link")
        if link_data:
            serializer = TeamGraphLinkSerializer(data=link_data, context={"request": request, "team": team})
            if serializer.is_valid():
                link = serializer.save()
                return Response(TeamGraphLinkSerializer(link).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": "Provide node or link"}, status=status.HTTP_400_BAD_REQUEST)
