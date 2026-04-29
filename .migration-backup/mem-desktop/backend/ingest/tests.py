import tempfile
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import QueryArtifact


class ChatApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tmpdir = tempfile.TemporaryDirectory()
        self.temp_root = Path(self.tmpdir.name)
        self.base_dir = self.temp_root / "backend"
        self.wiki_dir = self.temp_root / "workspace" / "wiki"
        self.wiki_dir.mkdir(parents=True, exist_ok=True)
        (self.wiki_dir / "Test_Page.md").write_text(
            "# Test Page\n\nThis page references [[Related_Page]].",
            encoding="utf-8",
        )
        (self.wiki_dir / "Related_Page.md").write_text(
            "# Related Page\n\nSupporting details for testing.",
            encoding="utf-8",
        )

    def tearDown(self):
        self.tmpdir.cleanup()

    @patch("ingest.views.ai_client.answer_question")
    def test_chat_response_contains_metadata(self, mock_answer):
        mock_answer.return_value = "Mocked response"
        with override_settings(BASE_DIR=self.base_dir):
            response = self.client.post("/api/chat", {"question": "What is this?", "surface": "main"}, format="json")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("answer", data)
        self.assertIn("citations", data)
        self.assertIn("confidence", data)
        self.assertIn("reasoning_summary", data)
        if data["citations"]:
            self.assertIn("type", data["citations"][0])
            self.assertIn("relevance_score", data["citations"][0])

    @patch("ingest.views.ai_client.answer_question")
    def test_chat_page_context_includes_focus_citation(self, mock_answer):
        mock_answer.return_value = "Context-aware answer"
        with override_settings(BASE_DIR=self.base_dir):
            response = self.client.post(
                "/api/chat",
                {"question": "Explain this page", "page_context": "Test_Page", "surface": "wiki"},
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["confidence"], "high")
        self.assertTrue(any(c.get("page_title") == "Test_Page" for c in data.get("citations", [])))
        focus = next((c for c in data.get("citations", []) if c.get("page_title") == "Test_Page"), {})
        self.assertIn("type", focus)

    @patch("ingest.views.ai_client.answer_question")
    def test_chat_auto_compounds_artifact(self, mock_answer):
        mock_answer.return_value = "Durable answer"
        response = self.client.post("/api/chat", {"question": "Create durable artifact?"}, format="json")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("artifact", data)
        self.assertTrue(QueryArtifact.objects.exists())

    @patch("ingest.views.ingest_processor.process_file")
    def test_ingest_returns_policy_payload(self, mock_process):
        mock_process.return_value = {
            "status": "staged",
            "policy": {
                "passed": False,
                "gate_level": "soft",
                "risk_score": 40,
                "checks": {"index_updated": False},
                "missing": ["index_updated"],
                "remediation_ids": [],
            },
            "proposed_changes": {},
        }
        file_path = self.temp_root / "sample.txt"
        file_path.write_text("Some content that is sufficiently long for ingest testing." * 5, encoding="utf-8")
        with file_path.open("rb") as handle:
            response = self.client.post("/api/ingest", {"file": handle}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertIn("policy", response.json())

    def test_lint_endpoints(self):
        run = self.client.post("/api/lint/run", {"async": False}, format="json")
        self.assertIn(run.status_code, (200, 202))
        status_res = self.client.get("/api/lint/status")
        self.assertEqual(status_res.status_code, 200)
        findings = self.client.get("/api/lint/findings")
        self.assertEqual(findings.status_code, 200)
