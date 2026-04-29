from django.conf import settings
from ..models import Team, TeamChatMessage, TeamActivity


def team_chat_processor(team, user, question, ai_client):
    """
    Process a chat message for a team.
    
    1. Store the user's message
    2. Build team context
    3. Query AI
    4. Store AI response
    5. Return response
    """
    user_message = TeamChatMessage.objects.create(
        team=team,
        user=user,
        content=question,
    )

    TeamActivity.objects.create(
        team=team,
        user=user,
        action="chat_asked",
        metadata={"question_preview": question[:100]},
    )

    from .context import TeamAIContext
    team_context = TeamAIContext(team, user)
    system_prompt = team_context.build_system_prompt(question)
    search_context = team_context.build_context_for_query()

    full_prompt = f"""{system_prompt}

Below is relevant context from the team's knowledge base:
{search_context}

Question: {question}
"""

    messages = [
        {"role": "system", "content": full_prompt},
        {"role": "user", "content": question},
    ]


    try:
        answer = ai_client.answer_question(
            question,
            wiki_pages_content=search_context
        )
    except Exception as e:
        answer = f"I encountered an error searching the team knowledge base: {str(e)}"

    ai_message = TeamChatMessage.objects.create(
        team=team,
        user=user,
        content=answer,
        is_ai_response=True,
    )

    return {
        "user_message": {
            "id": str(user_message.id),
            "content": user_message.content,
            "user": user.username,
            "created_at": user_message.created_at.isoformat(),
        },
        "ai_response": {
            "id": str(ai_message.id),
            "content": ai_message.content,
            "created_at": ai_message.created_at.isoformat(),
        },
        "context_used": {
            "pages_searched": team_context.pinned_pages().count(),
            "team_members": team_context.member_count(),
        },
    }
