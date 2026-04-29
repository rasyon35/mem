from django.conf import settings
from ..models import Team, TeamMembership, TeamPage, TeamChatMessage, TeamActivity


class TeamAIContext:
    """
    Provides team-specific context for AI queries.
    
    Usage:
        context = TeamAIContext(team, user)
        prompt = context.build_system_prompt(user_question)
    """

    def __init__(self, team, user=None):
        self.team = team
        self.user = user

    def build_system_prompt(self, user_question=""):
        team_info = f"""You are answering questions about the '{self.team.name}' team workspace.
This is a collaborative knowledge environment with {self.member_count()} members.
Team description: {self.team.description or 'No description provided.'}
"""

        pinned_pages = self.pinned_pages()
        if pinned_pages:
            team_info += "\n📌 Pinned Pages:\n"
            for page in pinned_pages[:5]:
                team_info += f"- {page.title}: {page.description[:100]}\n"

        recent_activity = self.recent_activity()
        if recent_activity:
            team_info += "\n📊 Recent Activity:\n"
            for activity in recent_activity[:10]:
                team_info += f"- {activity['action']}: {activity.get('summary', 'No summary')}\n"

        return team_info.strip()

    def build_context_for_query(self):
        """Build searchable context from team resources."""
        context_parts = []

        pages = self.team.pages.filter(
            is_archived=False
        ).order_by("-updated_at")[:20]

        context_parts.append("=== TEAM PAGES ===")
        for page in pages:
            context_parts.append(f"\n## {page.title}\n")
            if page.description:
                context_parts.append(f"Description: {page.description}\n")
            if page.content:
                content_str = str(page.content)[:500]
                context_parts.append(f"Content: {content_str}...\n")

        chat_history = self.team.chat_messages.all()[:50]
        context_parts.append("\n=== RECENT DISCUSSIONS ===")
        for msg in chat_history:
            if not msg.is_ai_response:
                context_parts.append(f"\n[{msg.user.username}]: {msg.content[:200]}\n")

        return "\n".join(context_parts)

    def member_count(self):
        return self.team.memberships.filter(is_active=True).count()

    def pinned_pages(self):
        return self.team.pages.filter(is_pinned=True, is_archived=False)[:10]

    def recent_activity(self):
        activities = self.team.activities.all()[:20]
        return [
            {
                "action": a.action,
                "user": a.user.username if a.user else "System",
                "summary": a.metadata.get("title", ""),
                "created_at": a.created_at.isoformat(),
            }
            for a in activities
        ]

    def get_relevant_pages(self, query, limit=5):
        """Search team pages for relevance to query."""
        return self.team.pages.filter(
            is_archived=False
        ).filter(
            __raw__={
                "$or": [
                    {"title": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}},
                ]
            }
        )[:limit]
