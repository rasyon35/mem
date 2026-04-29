from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Topic, Subtopic


@api_view(["GET"])
def topics_collection(request):
    topics = Topic.objects.all().prefetch_related("subtopics")
    return Response({
        "topics": [
            {
                "id": t.id,
                "name": t.name,
                "subtopics": [
                    {"id": s.id, "name": s.name}
                    for s in t.subtopics.all()
                ],
            }
            for t in topics
        ]
    })


@api_view(["GET"])
def subtopics_for_topic(request, topic_id):
    subtopics = Subtopic.objects.filter(topic_id=topic_id)
    return Response({
        "subtopics": [
            {"id": s.id, "name": s.name}
            for s in subtopics
        ]
    })
