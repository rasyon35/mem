import re
from typing import Dict, List, Tuple

from django.utils.text import slugify

from .models import Entity, EntityAlias, EntityMention, PageBlock, WorkspacePage


def normalize_entities_for_page(page: WorkspacePage):
    mentions = extract_candidate_entities(page)
    EntityMention.objects.filter(page=page).delete()
    for mention, block in mentions:
        entity = upsert_entity(mention)
        EntityMention.objects.create(
            entity=entity,
            page=page,
            block=block,
            mention_text=mention,
        )


def resolve_alias(target: str) -> Tuple[Entity, str]:
    normalized = target.strip()
    alias = EntityAlias.objects.filter(alias__iexact=normalized).select_related("entity").first()
    if alias:
        return alias.entity, alias.entity.canonical_name
    entity = Entity.objects.filter(canonical_name__iexact=normalized).first()
    if entity:
        return entity, entity.canonical_name
    entity = upsert_entity(normalized)
    return entity, entity.canonical_name


def upsert_entity(name: str) -> Entity:
    canonical = name.strip()
    slug = slugify(canonical)[:220] or canonical.lower().replace(" ", "-")
    entity, _ = Entity.objects.get_or_create(
        slug=slug,
        defaults={"canonical_name": canonical},
    )
    if entity.canonical_name != canonical:
        EntityAlias.objects.get_or_create(entity=entity, alias=canonical)
    return entity


def extract_candidate_entities(page: WorkspacePage) -> List[Tuple[str, PageBlock]]:
    candidates: List[Tuple[str, PageBlock]] = []
    for block in page.blocks.all():
        text = ""
        if isinstance(block.content_json, dict):
            text = str(block.content_json.get("text", ""))
        for token in re.findall(r"\b[A-Z][a-zA-Z0-9_]{2,}\b", text):
            candidates.append((token, block))
    return candidates


def entity_alias_map() -> Dict[str, str]:
    aliases: Dict[str, str] = {}
    for alias in EntityAlias.objects.select_related("entity"):
        aliases[alias.alias.lower()] = alias.entity.canonical_name
    for entity in Entity.objects.all():
        aliases[entity.canonical_name.lower()] = entity.canonical_name
    return aliases
