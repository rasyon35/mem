import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import EntityMention, PageLink, PageRevision, Subtopic, Topic, WorkspacePage, PageBlock


class KnowledgeApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tmpdir = tempfile.TemporaryDirectory()
        tmp_path = Path(self.tmpdir.name)
        self.test_workspace = tmp_path / "workspace"
        self.test_wiki = self.test_workspace / "wiki"
        self.test_wiki.mkdir(parents=True, exist_ok=True)
        self.settings_override = override_settings(
            WORKSPACE_ROOT=self.test_workspace,
            WORKSPACE_WIKI_DIR=self.test_wiki,
            WORKSPACE_RAW_DIR=self.test_workspace / "raw",
        )
        self.settings_override.enable()

    def tearDown(self):
        self.settings_override.disable()
        self.tmpdir.cleanup()

    def test_create_page(self):
        res = self.client.post("/api/knowledge/pages", {"title": "Test Page"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(WorkspacePage.objects.filter(title="Test Page").exists())

    def test_blocks_crud(self):
        page = WorkspacePage.objects.create(slug="test-page", title="Test Page")
        create = self.client.post(
            f"/api/knowledge/pages/{page.id}/blocks",
            {"block_type": "paragraph", "content_json": {"text": "Hello"}},
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        block_id = create.json()["block"]["id"]

        patch = self.client.patch(
            f"/api/knowledge/pages/{page.id}/blocks",
            {"block_id": block_id, "content_json": {"text": "Updated"}},
            format="json",
        )
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(PageBlock.objects.get(id=block_id).content_json.get("text"), "Updated")

    def test_search_pages(self):
        WorkspacePage.objects.create(slug="alpha", title="Alpha Notes")
        WorkspacePage.objects.create(slug="beta", title="Beta Notes")
        res = self.client.get("/api/knowledge/search?q=Alpha")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json().get("pages", [])), 1)

    def test_markdown_import_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            wiki_dir = tmp_path / "workspace" / "wiki"
            wiki_dir.mkdir(parents=True, exist_ok=True)
            (wiki_dir / "Page_One.md").write_text("# Page One\n\n- item", encoding="utf-8")

            with override_settings(WORKSPACE_WIKI_DIR=wiki_dir, WORKSPACE_ROOT=(tmp_path / "workspace"), WORKSPACE_RAW_DIR=(tmp_path / "workspace" / "raw")):
                call_command("import_markdown_wiki")
                call_command("import_markdown_wiki")

            self.assertEqual(WorkspacePage.objects.count(), 1)
            page = WorkspacePage.objects.first()
            self.assertGreaterEqual(PageBlock.objects.filter(page=page).count(), 1)

    def test_ingest_preview_and_current(self):
        page = WorkspacePage.objects.create(slug="target-page", title="Target Page")
        PageBlock.objects.create(page=page, block_type="paragraph", content_json={"text": "Existing"}, order_index=0)

        preview = self.client.post("/api/knowledge/ingest/preview", {"text": "# Heading\n\n- Bullet line"}, format="json")
        self.assertEqual(preview.status_code, 200)
        self.assertGreaterEqual(preview.json().get("count", 0), 2)

        apply_res = self.client.post(
            "/api/knowledge/ingest/current",
            {"page_id": page.id, "text": "New paragraph line"},
            format="json",
        )
        self.assertEqual(apply_res.status_code, 200)
        self.assertTrue(PageBlock.objects.filter(page=page, content_json__text__icontains="New paragraph").exists())

    def test_ingest_new_page_and_graph(self):
        create_res = self.client.post("/api/knowledge/ingest/new_page", {"title": "Graph Seed", "text": "[[Other]] link body"}, format="json")
        self.assertEqual(create_res.status_code, 201)
        first_page = WorkspacePage.objects.get(title="Graph Seed")
        second_page = WorkspacePage.objects.create(slug="other", title="Other")
        PageBlock.objects.create(page=first_page, block_type="paragraph", content_json={"text": "[[Other]]"}, order_index=1)
        self.client.patch(
            f"/api/knowledge/pages/{first_page.id}/blocks",
            {"block_id": first_page.blocks.first().id, "content_json": {"text": "[[Other]] linked"}},
            format="json",
        )
        self.assertTrue(PageLink.objects.filter(from_page=first_page, to_page=second_page).exists())

        graph = self.client.get("/api/knowledge/graph")
        self.assertEqual(graph.status_code, 200)
        self.assertGreaterEqual(graph.json().get("stats", {}).get("node_count", 0), 2)

    def test_revision_restore(self):
        page = WorkspacePage.objects.create(slug="restore-page", title="Restore Page")
        block = PageBlock.objects.create(page=page, block_type="paragraph", content_json={"text": "Before"}, order_index=0)
        rev = self.client.post(f"/api/knowledge/pages/{page.id}/revisions", {"summary": "snap"}, format="json")
        self.assertEqual(rev.status_code, 201)
        revision = PageRevision.objects.get(id=rev.json()["revision_id"])

        self.client.patch(
            f"/api/knowledge/pages/{page.id}/blocks",
            {"block_id": block.id, "content_json": {"text": "After"}},
            format="json",
        )
        restore = self.client.post(f"/api/knowledge/pages/{page.id}/revisions/{revision.id}/restore", {}, format="json")
        self.assertEqual(restore.status_code, 200)
        restored = page.blocks.order_by("order_index").first()
        self.assertIsNotNone(restored)
        self.assertEqual(restored.content_json.get("text"), "Before")

    def test_topics_and_subtopics_endpoints(self):
        topic = Topic.objects.create(name="AI Research", icon="sparkles")
        subtopic = Subtopic.objects.create(topic=topic, name="LLM Agents")
        page = WorkspacePage.objects.create(slug="agents-101", title="Agents 101", topic=topic, subtopic=subtopic)

        topics_res = self.client.get("/api/topics")
        self.assertEqual(topics_res.status_code, 200)
        self.assertGreaterEqual(len(topics_res.json().get("topics", [])), 1)

        subtopics_res = self.client.get(f"/api/topics/{topic.id}/subtopics")
        self.assertEqual(subtopics_res.status_code, 200)
        self.assertEqual(len(subtopics_res.json().get("subtopics", [])), 1)

        pages_res = self.client.get(f"/api/wiki/pages?topic={topic.id}&subtopic={subtopic.id}")
        self.assertEqual(pages_res.status_code, 200)
        self.assertEqual(len(pages_res.json().get("pages", [])), 1)

    def test_entity_mentions_created_on_link_refresh(self):
        page = WorkspacePage.objects.create(slug="entity-page", title="Entity Page")
        block = PageBlock.objects.create(
            page=page,
            block_type="paragraph",
            content_json={"text": "OpenAI builds systems with ChatGPT Agents."},
            order_index=0,
        )
        res = self.client.patch(
            f"/api/knowledge/pages/{page.id}/blocks",
            {"block_id": block.id, "content_json": {"text": "OpenAI builds systems with ChatGPT Agents."}},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(EntityMention.objects.filter(page=page).count(), 1)
