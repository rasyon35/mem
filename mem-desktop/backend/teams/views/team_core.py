from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.utils import timezone
import json

from ..models import (
    Team,
    TeamMembership,
    TeamInvite,
    TeamOnboarding,
    TeamActivity,
    TeamAuditLog,
)
from ..serializers import (
    TeamSerializer,
    TeamCreateSerializer,
    TeamMembershipSerializer,
    TeamInviteSerializer,
    TeamOnboardingSerializer,
    TeamActivitySerializer,
    TeamAuditLogSerializer,
)


def get_team_membership(request, team):
    if not request.user.is_authenticated:
        return None
    return TeamMembership.objects.filter(team=team, user=request.user, is_active=True).first()


def require_role(*allowed_roles):
    def decorator(view_func):
        def wrapper(request, team_id, *args, **kwargs):
            try:
                team = Team.objects.get(id=team_id)
                membership = get_team_membership(request, team)
                if not membership:
                    return Response(
                        {"error": "You are not a member of this team"},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                if membership.role not in allowed_roles and "owner" not in allowed_roles:
                    if membership.role != "owner":
                        return Response(
                            {"error": "Insufficient permissions"},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                return view_func(request, team, membership, *args, **kwargs)
            except Team.DoesNotExist:
                return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)
        return wrapper
    return decorator


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_list_create(request):
    if request.method == "GET":
        memberships = TeamMembership.objects.filter(
            user=request.user, is_active=True
        ).select_related("team")
        teams = [m.team for m in memberships]
        serializer = TeamSerializer(teams, many=True, context={"request": request})
        return Response(serializer.data)

    elif request.method == "POST":
        serializer = TeamCreateSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            team = serializer.save()
            TeamActivity.objects.create(
                team=team,
                user=request.user,
                action="team_created",
                target_type="team",
                target_id=team.id,
            )
            return Response(TeamSerializer(team, context={"request": request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def team_detail(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(TeamSerializer(team, context={"request": request}).data)

    elif request.method == "PUT":
        if membership.role != "owner":
            return Response({"error": "Only owner can update"}, status=status.HTTP_403_FORBIDDEN)
        serializer = TeamSerializer(team, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        if membership.role != "owner":
            return Response({"error": "Only owner can delete"}, status=status.HTTP_403_FORBIDDEN)
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def team_home(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    recent_pages = team.pages.all().order_by("-updated_at")[:10]
    activities = team.activities.all().order_by("-created_at")[:20]
    conflicts = team.conflicts.filter(status__in=["detected", "in_review"])[:5]
    notifications = request.user.team_notifications.filter(team=team, read=False)[:10]

    return Response({
        "team": TeamSerializer(team, context={"request": request}).data,
        "recent_pages": [p.title for p in recent_pages],
        "activities": TeamActivitySerializer(activities, many=True).data,
        "conflicts": len(conflicts),
        "notifications": TeamNotificationSerializer(notifications, many=True).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_teams(request):
    memberships = TeamMembership.objects.filter(
        user=request.user, is_active=True
    ).select_related("team")
    return Response({
        "teams": [
            {
                "id": m.team.id,
                "name": m.team.name,
                "role": m.role,
                "unread_notifications": request.user.team_notifications.filter(
                    team=m.team, read=False
                ).count(),
            }
            for m in memberships
        ]
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_members(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        members = team.memberships.filter(is_active=True).select_related("user")
        return Response(TeamMembershipSerializer(members, many=True).data)

    elif request.method == "POST":
        if membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        user_id = request.data.get("user_id")
        role = request.data.get("role", "viewer")
        if role not in ["viewer", "editor", "owner"]:
            return Response({"error": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)
        new_member = TeamMembership.objects.create(
            team=team, user_id=user_id, role=role
        )
        TeamActivity.objects.create(
            team=team,
            user=request.user,
            action="member_added",
            target_type="user",
            target_id=user_id,
        )
        return Response(TeamMembershipSerializer(new_member).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_member(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership or membership.role != "owner":
            return Response({"error": "Only owner can remove members"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    user_id = request.data.get("user_id")
    if str(user_id) == str(request.user.id):
        return Response({"error": "Cannot remove yourself"}, status=status.HTTP_400_BAD_REQUEST)

    target_membership = TeamMembership.objects.filter(
        team=team, user_id=user_id, is_active=True
    ).first()
    if not target_membership:
        return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)

    target_membership.is_active = False
    target_membership.save()

    TeamAuditLog.objects.create(
        team=team,
        action="member_removed",
        actor=request.user,
        target_user_id=user_id,
    )

    return Response({"success": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_invite(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership or membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    import secrets
    code = secrets.token_urlsafe(8)[:12]
    invite = TeamInvite.objects.create(
        team=team,
        invited_by=request.user,
        code=code,
        role=request.data.get("role", "viewer"),
        max_uses=request.data.get("max_uses", 1),
        expires_at=request.data.get("expires_at"),
    )
    return Response(TeamInviteSerializer(invite).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def accept_invite(request, code):
    try:
        invite = TeamInvite.objects.get(code=code)
        if not invite.is_valid:
            return Response({"error": "Invite expired or max uses reached"}, status=status.HTTP_400_BAD_REQUEST)
    except TeamInvite.DoesNotExist:
        return Response({"error": "Invalid invite"}, status=status.HTTP_404_NOT_FOUND)

    membership, created = TeamMembership.objects.get_or_create(
        team=invite.team,
        user=request.user,
        defaults={"role": invite.role, "is_active": True},
    )
    if not created:
        membership.is_active = True
        membership.save()

    invite.uses += 1
    invite.save()

    TeamActivity.objects.create(
        team=invite.team,
        user=request.user,
        action="member_joined",
        target_type="user",
        target_id=request.user.id,
    )

    return Response({"success": True, "team_id": invite.team.id})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def join_team(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    if team.visibility == "private":
        return Response({"error": "Cannot join private team without invite"}, status=status.HTTP_403_FORBIDDEN)

    membership, created = TeamMembership.objects.get_or_create(
        team=team,
        user=request.user,
        defaults={"role": "viewer", "is_active": True},
    )

    if not created:
        return Response({"error": "Already a member"}, status=status.HTTP_400_BAD_REQUEST)

    TeamActivity.objects.create(
        team=team,
        user=request.user,
        action="member_joined",
        target_type="user",
        target_id=request.user.id,
    )

    return Response({"success": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def transfer_ownership(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        current = TeamMembership.objects.get(team=team, user=request.user, role="owner")
    except (Team.DoesNotExist, TeamMembership.DoesNotExist):
        return Response({"error": "Only owner can transfer ownership"}, status=status.HTTP_403_FORBIDDEN)

    new_owner_id = request.data.get("new_owner_id")
    if not new_owner_id:
        return Response({"error": "new_owner_id required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        new_owner = TeamMembership.objects.get(team=team, user_id=new_owner_id)
        new_owner.role = "owner"
        new_owner.save()

        current.role = "editor"
        current.save()

        TeamAuditLog.objects.create(
            team=team,
            action="ownership_transferred",
            actor=request.user,
            target_user_id=new_owner_id,
        )

        return Response({"transferred": True})
    except TeamMembership.DoesNotExist:
        return Response({"error": "New owner not found in team"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def workspace_switcher(request):
    personal_count = 0
    teams_data = []

    memberships = TeamMembership.objects.filter(
        user=request.user, is_active=True
    ).select_related("team")

    for m in memberships:
        teams_data.append({
            "id": m.team.id,
            "name": m.team.name,
            "role": m.role,
            "type": "team",
        })

    return Response({
        "current_context": request.headers.get("X-Workspace-Context", "personal"),
        "personal": {"type": "personal", "label": "Personal"},
        "teams": teams_data,
    })
