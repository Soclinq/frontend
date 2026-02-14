from django.urls import path
from community.views import (NearbyCommunitiesByLocationView, MessageDeleteView,
                             GroupMessagesView, ChatUploadView, MessageDeleteForMeView,
                             MessageInfoView, MessageForwardView, CommunityHubSearchView,
                             JoinCommunityHubView, PrivateInboxView, NewChatSearchUsersView,
                             OpenPrivateConversationView, PrivateConversationMessagesView,
                             )

urlpatterns = [
    path("nearby/", NearbyCommunitiesByLocationView.as_view()),
    path("chat/groups/<uuid:group_id>/messages/", GroupMessagesView.as_view()),
    path("chat/uploads/", ChatUploadView.as_view()),
    path("chat/messages/<uuid:message_id>/", MessageDeleteView.as_view()),
    path("chat/messages/<uuid:message_id>/delete-for-me/", MessageDeleteForMeView.as_view()),
    path("chat/messages/<uuid:message_id>/info/", MessageInfoView.as_view()),
    path("chat/messages/<uuid:message_id>/forward/", MessageForwardView.as_view()),
    path("search/", CommunityHubSearchView.as_view()),
    path("<uuid:hub_id>/join/", JoinCommunityHubView.as_view()),
    path("private/inbox/", PrivateInboxView.as_view(), name="private_inbox"),
    path("chat/new-chat/search-users", NewChatSearchUsersView.as_view()),
    path("private/open/", OpenPrivateConversationView.as_view()),
    path("private/chat/conversations/<uuid:conversation_id>/messages/",PrivateConversationMessagesView.as_view(),),
    path("private/chat/uploads/", ChatUploadView.as_view()),
]

