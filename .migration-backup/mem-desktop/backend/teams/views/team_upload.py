from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Team, TeamPage
from .team_core import get_team_membership


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_to_team(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

    # Create a page entry for the uploaded file
    page = TeamPage.objects.create(
        team=team,
        title=uploaded_file.name,
        content_json={"type": "file", "original_name": uploaded_file.name, "size": uploaded_file.size},
        page_type="knowledge_node",
        created_by=request.user,
    )

    return Response({
        "id": str(page.id),
        "title": page.title,
        "size": uploaded_file.size,
    }, status=status.HTTP_201_CREATED)
