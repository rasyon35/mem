from django.contrib import admin

from .models import Topic, Subtopic, WorkspacePage, PageBlock, PageLink, PageRevision, PageTemplate


admin.site.register(WorkspacePage)
admin.site.register(Topic)
admin.site.register(Subtopic)
admin.site.register(PageBlock)
admin.site.register(PageLink)
admin.site.register(PageRevision)
admin.site.register(PageTemplate)
