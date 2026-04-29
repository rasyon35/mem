from django.db import models
from django.conf import settings


class TeamGraphNode(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="graph_nodes")
    node_type = models.CharField(max_length=50)
    content = models.JSONField(default=dict)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_graph_nodes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.node_type} node"


class TeamGraphLink(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="graph_links")
    source_node = models.ForeignKey(TeamGraphNode, on_delete=models.CASCADE, related_name="outgoing_links")
    target_node = models.ForeignKey(TeamGraphNode, on_delete=models.CASCADE, related_name="incoming_links")
    link_type = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.source_node} -> {self.target_node}"
