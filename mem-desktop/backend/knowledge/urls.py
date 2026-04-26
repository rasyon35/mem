from django.urls import path
from . import views


urlpatterns = [
    path("topics", views.topics_collection, name="topics"),
    path("topics/<int:topic_id>/subtopics", views.subtopics_for_topic, name="topic-subtopics"),
    path("wiki/pages", views.pages_collection, name="wiki-pages"),
    path("wiki/markdown-files", views.wiki_markdown_files, name="wiki-markdown-files"),
    path("wiki/recent", views.recent_pages, name="wiki-recent"),
    path("wiki/pages/create", views.pages_collection, name="wiki-page-create"),
    path("wiki/page/<int:page_id>", views.page_detail, name="wiki-page-by-id"),
    path("wiki/page/<int:page_id>/version", views.page_revisions, name="wiki-page-version"),
    path("wiki/page/<int:page_id>/ingest", views.ingest_page_to_knowledge, name="wiki-page-ingest"),
    path("knowledge/pages", views.pages_collection, name="knowledge-pages"),
    path("knowledge/pages/<int:page_id>", views.page_detail, name="knowledge-page-detail"),
    path("knowledge/pages/<int:page_id>/blocks", views.page_blocks, name="knowledge-page-blocks"),
    path("knowledge/pages/<int:page_id>/links", views.page_links, name="knowledge-page-links"),
    path("knowledge/pages/<int:page_id>/backlinks", views.page_backlinks, name="knowledge-page-backlinks"),
    path("knowledge/pages/<int:page_id>/revisions", views.page_revisions, name="knowledge-page-revisions"),
    path("knowledge/pages/<int:page_id>/revisions/<int:revision_id>/restore", views.restore_revision, name="knowledge-page-revision-restore"),
    path("knowledge/search", views.search_pages, name="knowledge-search"),
    path("knowledge/recent", views.recent_pages, name="knowledge-recent"),
    path("knowledge/graph", views.knowledge_graph, name="knowledge-graph"),
    path("knowledge/ingest/preview", views.ingest_preview, name="knowledge-ingest-preview"),
    path("knowledge/ingest/current", views.ingest_current_page, name="knowledge-ingest-current"),
    path("knowledge/ingest/new_page", views.ingest_new_page, name="knowledge-ingest-new-page"),
]
