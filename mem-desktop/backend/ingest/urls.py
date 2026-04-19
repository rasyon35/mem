from django.urls import path
from . import views

urlpatterns = [
    path("ingest", views.ingest_file, name="ingest"),
    path("approve", views.approve_changes, name="approve"),
    path("chat", views.chat_query, name="chat"),
    path("wiki", views.list_wiki_pages, name="wiki-list"),
    path("wiki/<str:title>", views.get_wiki_page, name="wiki-page"),
    path("history", views.get_git_history, name="history"),
    path("revert", views.revert_version, name="revert"),
    path("critical", views.manage_critical_pages, name="critical"),
    path("contradictions", views.list_contradictions, name="contradictions"),
]