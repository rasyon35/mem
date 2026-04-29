from django.utils.deprecation import MiddlewareMixin
from .models import TeamMembership


class WorkspaceContextMiddleware(MiddlewareMixin):
    """
    Adds workspace context to every request.
    
    Allows switching between:
    - Personal workspace (user's own memory)
    - Team workspace (collaborative memory)
    """

    def process_request(self, request):
        request.workspace_type = "personal"
        request.workspace_team = None
        request.workspace_membership = None

        team_id = request.headers.get("X-Team-ID") or request.GET.get("team")
        
        if team_id and request.user.is_authenticated:
            try:
                from teams.models import Team
                team = Team.objects.get(id=team_id)
                membership = TeamMembership.objects.filter(
                    team=team, user=request.user, is_active=True
                ).first()
                
                if membership:
                    request.workspace_type = "team"
                    request.workspace_team = team
                    request.workspace_membership = membership
            except (Team.DoesNotExist, TeamMembership.DoesNotExist):
                pass

        return None

    def process_response(self, request, response):
        response["X-Workspace-Type"] = request.workspace_type
        if hasattr(request, "workspace_team") and request.workspace_team:
            response["X-Team-ID"] = str(request.workspace_team.id)
        return response


def get_current_workspace(request):
    """
    Returns the current workspace context.
    
    Usage in views:
        workspace = get_current_workspace(request)
        if workspace['type'] == 'team':
            team = workspace['team']
    """
    return {
        "type": getattr(request, "workspace_type", "personal"),
        "team": getattr(request, "workspace_team", None),
        "membership": getattr(request, "workspace_membership", None),
    }


def require_workspace_role(allowed_roles):
    """
    Decorator to require specific workspace roles.
    
    Usage:
        @require_workspace_role(['owner', 'editor'])
        def edit_team_page(request):
            ...
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            workspace = get_current_workspace(request)
            
            if workspace["type"] == "personal":
                return Response(
                    {"error": "Team workspace required"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            membership = workspace["membership"]
            if not membership or membership.role not in allowed_roles:
                return Response(
                    {"error": f"Requires role: {allowed_roles}"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator