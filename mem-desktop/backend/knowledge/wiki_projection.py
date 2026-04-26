import json
import re
from pathlib import Path

from django.conf import settings
from django.utils.text import slugify

from .models import PageBlock, WorkspacePage


SYSTEM_FILES = {"index.md", "log.md"}


def workspace_wiki_dir() -> Path:
    wiki_dir = Path(settings.WORKSPACE_WIKI_DIR)
    wiki_dir.mkdir(parents=True, exist_ok=True)
    return wiki_dir


def markdown_page_paths():
    wiki_dir = workspace_wiki_dir()
    for md_file in sorted(wiki_dir.glob("*.md")):
        if md_file.name in SYSTEM_FILES:
            continue
        yield md_file


def _parse_frontmatter(raw: str):
    frontmatter = {}
    body = raw
    if not raw.startswith("---"):
        return frontmatter, body
    parts = raw.split("---", 2)
    if len(parts) < 3:
        return frontmatter, raw
    fm_block = parts[1]
    body = parts[2].lstrip("\n")
    for line in fm_block.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        frontmatter[key.strip()] = value.strip().strip('"').strip("'")
    return frontmatter, body


def _parse_tags(raw_tags: str):
    value = (raw_tags or "").strip()
    if not value:
        return []
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [part.strip().strip('"').strip("'") for part in inner.split(",") if part.strip()]
    return [value]


def _line_to_block(stripped: str, index: int):
    block_type = "paragraph"
    text = stripped
    if stripped.startswith("#"):
        block_type = "heading"
        text = stripped.lstrip("#").strip()
    elif stripped.startswith("- "):
        block_type = "bullet"
        text = stripped[2:].strip()
    elif stripped.startswith(">"):
        block_type = "quote"
        text = stripped.lstrip(">").strip()
    return {"block_type": block_type, "content_json": {"text": text}, "order_index": index}


def parse_markdown_file(md_file: Path):
    raw = md_file.read_text(encoding="utf-8")
    frontmatter, body = _parse_frontmatter(raw)
    title = frontmatter.get("title") or md_file.stem.replace("_", " ")
    slug = slugify(md_file.stem)[:220] or slugify(title)[:220]
    tags = _parse_tags(frontmatter.get("tags", ""))
    blocks = []
    index = 0
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        blocks.append(_line_to_block(stripped, index))
        index += 1
    return {
        "title": title,
        "slug": slug,
        "source_path": str(md_file),
        "description": frontmatter.get("description", ""),
        "page_type": frontmatter.get("type", "note"),
        "visibility": frontmatter.get("visibility", "private"),
        "publish_state": frontmatter.get("publish_state", "draft"),
        "tags": tags,
        "blocks": blocks,
    }


def sync_wiki_to_db():
    seen_slugs = set()
    for md_file in markdown_page_paths():
        try:
            parsed = parse_markdown_file(md_file)
        except Exception:
            # Skip unreadable or malformed markdown files rather than failing the whole API request.
            continue
        seen_slugs.add(parsed["slug"])
        page, created = WorkspacePage.objects.get_or_create(
            slug=parsed["slug"],
            defaults={
                "title": parsed["title"],
                "source_path": parsed["source_path"],
                "description": parsed["description"],
                "page_type": parsed["page_type"],
                "visibility": parsed["visibility"],
                "publish_state": parsed["publish_state"],
                "tags": parsed["tags"],
                "status": "active",
            },
        )
        update_fields = []
        for field in ("title", "source_path", "description", "page_type", "visibility", "publish_state", "tags"):
            value = parsed[field]
            if getattr(page, field) != value:
                setattr(page, field, value)
                update_fields.append(field)
        if page.status != "active":
            page.status = "active"
            update_fields.append("status")
        if update_fields:
            update_fields.append("updated_at")
            page.save(update_fields=update_fields)

        if created or page.blocks.count() != len(parsed["blocks"]):
            page.blocks.all().delete()
            for block in parsed["blocks"]:
                PageBlock.objects.create(page=page, **block)
            continue

        db_blocks = list(page.blocks.all())
        replace_blocks = False
        for idx, block in enumerate(db_blocks):
            expected = parsed["blocks"][idx]
            if block.block_type != expected["block_type"] or (block.content_json or {}) != expected["content_json"]:
                replace_blocks = True
                break
        if replace_blocks:
            page.blocks.all().delete()
            for block in parsed["blocks"]:
                PageBlock.objects.create(page=page, **block)

    WorkspacePage.objects.exclude(slug__in=seen_slugs).exclude(status="archived").exclude(source_path="").update(status="archived")


def write_page_to_file(page: WorkspacePage):
    wiki_dir = workspace_wiki_dir()
    file_path = wiki_dir / f"{page.slug}.md"
    lines = []
    for block in page.blocks.order_by("order_index", "id"):
        text = ""
        if isinstance(block.content_json, dict):
            text = str(block.content_json.get("text", "")).strip()
        if not text:
            continue
        if block.block_type == "heading":
            lines.append(f"# {text}")
        elif block.block_type == "bullet":
            lines.append(f"- {text}")
        elif block.block_type == "quote":
            lines.append(f"> {text}")
        else:
            lines.append(text)
    body = "\n\n".join(lines).strip()

    tags = page.tags if isinstance(page.tags, list) else []
    tags_literal = json.dumps(tags, ensure_ascii=True)
    frontmatter = (
        "---\n"
        f"title: {page.title}\n"
        f"description: {page.description}\n"
        f"type: {page.page_type}\n"
        f"visibility: {page.visibility}\n"
        f"publish_state: {page.publish_state}\n"
        f"tags: {tags_literal}\n"
        "---\n\n"
    )
    file_path.write_text(frontmatter + body + ("\n" if body else ""), encoding="utf-8")
    if page.source_path != str(file_path):
        page.source_path = str(file_path)
        page.save(update_fields=["source_path", "updated_at"])


def archive_page_file(page: WorkspacePage):
    src = workspace_wiki_dir() / f"{page.slug}.md"
    if not src.exists():
        return
    archive_dir = workspace_wiki_dir() / "_archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    archived_name = f"{page.slug}.{int(src.stat().st_mtime)}.md"
    src.rename(archive_dir / archived_name)
