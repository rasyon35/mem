from django.db import models

class Source(models.Model):
    name = models.CharField(max_length=255)
    source_type = models.CharField(max_length=50) # 'file' or 'url'
    path_or_url = models.TextField()
    summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.source_type})"

class Contradiction(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("dismissed", "Dismissed"),
    ]
    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="contradictions")
    existing_page = models.CharField(max_length=255)
    existing_claim = models.TextField()
    new_claim = models.TextField()
    confidence = models.CharField(max_length=20)  # high, medium, low
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conflict in {self.existing_page} from {self.source.name}"

class CriticalPage(models.Model):
    title = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class PageSource(models.Model):
    page_title = models.CharField(max_length=255)
    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="page_sources")
    page_reference = models.CharField(max_length=255, blank=True)
    chunk_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.page_title} -> {self.source.name}"
