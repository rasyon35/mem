from django.conf import settings
from ..models import Team, TeamPage


def get_team_decision_context(team):
    """Extract decision-related content from team."""
    decisions = team.pages.filter(
        page_type="decision",
        is_archived=False
    )
    
    context = "=== TEAM DECISIONS ===\n"
    for page in decisions:
        context += f"\n## {page.title}\n"
        context += f"Status: {page.publish_state}\n"
        if page.description:
            context += f"Summary: {page.description}\n"
    
    return context


def check_team_knowledge_conflicts(team, new_claim):
    """Check if a new claim conflicts with existing team knowledge."""
    conflicts = []

    existing_pages = team.pages.filter(
        page_type="decision",
        publish_state="canonical"
    )

    for page in existing_pages:
        if page.description and new_claim.lower() in page.description.lower():
            conflicts.append({
                "page_id": str(page.id),
                "page_title": page.title,
                "conflict_type": "possible_contradiction",
            })

    return conflicts
