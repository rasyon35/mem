from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import time


@api_view(["POST"])
def voice_capture(request):
    audio_file = request.FILES.get("audio")
    if not audio_file:
        return Response({"error": "No audio file provided"}, status=status.HTTP_400_BAD_REQUEST)

    # Placeholder for voice processing
    return Response({
        "transcribed": "Voice capture placeholder",
        "timestamp": time.time(),
    })
