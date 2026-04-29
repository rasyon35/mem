from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from ..models import Team, TeamMembership, TeamPage, TeamPageRevision
from ..serializers import TeamPageSerializer, TeamPageRevisionSerializer
from .team_core import get_team_membership, require_role


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_pages(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        pages = team.pages.all().order_by("-updated_at")
        return Response(TeamPageSerializer(pages, many=True).data)

    elif request.method == "POST":
        if membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        serializer = TeamPageSerializer(data=request.data, context={"request": request, "team": team})
        if serializer.is_valid():
            page = serializer.save()
            TeamPageRevision.objects.create(
                page=page,
                editor=request.user,
                content_snapshot=page.content_json,
                note="Initial creation",
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def team_page_detail(request, team_id, page_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
        page = TeamPage.objects.get(id=page_id, team=team)
    except (Team.DoesNotExist, TeamPage.DoesNotExist):
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(TeamPageSerializer(page).data)

    elif request.method == "PUT":
        if membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        serializer = TeamPageSerializer(page, data=request.data, partial=True, context={"request": request, "team": team})
        if serializer.is_valid():
            serializer.save()
            TeamPageRevision.objects.create(
                page=page,
                editor=request.user,
                content_snapshot=page.content_json,
                note=request.data.get("revision_note", "Updated"),
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        if membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def lock_page(request, team_id, page_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
        page = TeamPage.objects.get(id=page_id, team=team)
    except (Team.DoesNotExist, TeamPage.DoesNotExist):
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    if page.locked_by and page.locked_by != request.user:
        return Response({"error": "Page is locked by another user"}, status=status.HTTP_409_CONFLICT)

    page.locked_by = request.user
    page.save()
    return Response({"locked": True, "locked_by": request.user.username})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unlock_page(request, team_id, page_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
        page = TeamPage.objects.get(id=page_id, team=team)
    except (Team.DoesNotExist, TeamPage.DoesNotExist):
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    if page.locked_by and page.locked_by != request.user and membership.role != "owner":
        return Response({"error": "Only locker or owner can unlock"}, status=status.HTTP_403_FORBIDDEN)

    page.locked_by = None
    page.save()
    return Response({"locked": False})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def team_page_revisions(request, team_id, page_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
        page = TeamPage.objects.get(id=page_id, team=team)
    except (Team.DoesNotExist, TeamPage.DoesNotExist):
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    revisions = page.revisions.all().order_by("-created_at")
    return Response(TeamPageRevisionSerializer(revisions, many=True).data)
