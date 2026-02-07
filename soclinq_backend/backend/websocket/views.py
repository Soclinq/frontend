from django.shortcuts import render

# Create your views here.
# websocket/views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from websocket.ws_tokens import issue_ws_token

class WebSocketTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = issue_ws_token(request.user)
        return Response({"wsToken": token})
