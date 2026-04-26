from django.db import models


class Topic(models.Model):
    name = models.CharField(max_length=120, unique=True)
    icon = models.CharField(max_length=32, blank=True, default="")
    description = models.CharField(max_length=300, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]


class Subtopic(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="subtopics")
    name = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("topic", "name")


class WorkspacePage(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("archived", "Archived"),
    ]

    slug = models.SlugField(unique=True, max_length=220)
    title = models.CharField(max_length=220)
    icon = models.CharField(max_length=32, blank=True, default="")
    cover = models.CharField(max_length=512, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    source_path = models.CharField(max_length=512, blank=True, default="")
    last_edited_by = models.CharField(max_length=120, blank=True, default="Local User")
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name="pages")
    subtopic = models.ForeignKey(Subtopic, on_delete=models.SET_NULL, null=True, blank=True, related_name="pages")
    tags = models.JSONField(default=list, blank=True)
    description = models.CharField(max_length=500, blank=True, default="")
    page_type = models.CharField(max_length=40, blank=True, default="note")
    visibility = models.CharField(max_length=20, blank=True, default="private")
    publish_state = models.CharField(max_length=20, blank=True, default="draft")
    is_favorite = models.BooleanField(default=False)
    ingestion_status = models.CharField(max_length=20, blank=True, default="idle")
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title"]


class PageBlock(models.Model):
    BLOCK_CHOICES = [
        ("paragraph", "Paragraph"),
        ("heading", "Heading"),
        ("bullet", "Bullet"),
        ("quote", "Quote"),
        ("code", "Code"),
        ("callout", "Callout"),
        ("divider", "Divider"),
    ]

    page = models.ForeignKey(WorkspacePage, on_delete=models.CASCADE, related_name="blocks")
    parent_block = models.ForeignKey(
        "self", on_delete=models.CASCADE, related_name="children", null=True, blank=True
    )
    block_type = models.CharField(max_length=32, choices=BLOCK_CHOICES, default="paragraph")
    content_json = models.JSONField(default=dict)
    order_index = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order_index", "id"]


class PageLink(models.Model):
    from_page = models.ForeignKey(
        WorkspacePage, on_delete=models.CASCADE, related_name="outgoing_links"
    )
    to_page = models.ForeignKey(
        WorkspacePage, on_delete=models.CASCADE, related_name="incoming_links"
    )
    link_text = models.CharField(max_length=220)
    context_block = models.ForeignKey(
        PageBlock, on_delete=models.SET_NULL, null=True, blank=True, related_name="links"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("from_page", "to_page", "link_text")


class PageRevision(models.Model):
    page = models.ForeignKey(WorkspacePage, on_delete=models.CASCADE, related_name="revisions")
    snapshot_json = models.JSONField(default=dict)
    summary = models.CharField(max_length=300, blank=True, default="")
    author = models.CharField(max_length=120, default="Local User")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class PageTemplate(models.Model):
    name = models.CharField(max_length=120, unique=True)
    starter_blocks = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class Entity(models.Model):
    canonical_name = models.CharField(max_length=220, unique=True)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class EntityAlias(models.Model):
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name="aliases")
    alias = models.CharField(max_length=220, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)


class EntityMention(models.Model):
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name="mentions")
    page = models.ForeignKey(WorkspacePage, on_delete=models.CASCADE, related_name="entity_mentions")
    block = models.ForeignKey(PageBlock, on_delete=models.SET_NULL, null=True, blank=True, related_name="entity_mentions")
    mention_text = models.CharField(max_length=220)
    created_at = models.DateTimeField(auto_now_add=True)

