import re
import time
from collections import deque
from pathlib import Path
from typing import Any

from django.conf import settings


class GraphService:
    def __init__(self):
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}

    def _cfg(self, key: str, default: Any) -> Any:
        return getattr(settings, key, default)

    def _revision_key(self, wiki_dir: Path) -> str:
        files = [f for f in wiki_dir.glob("*.md") if f.name not in ("index.md", "log.md")]
        if not files:
            return "empty"
        latest_mtime = max(int(f.stat().st_mtime) for f in files)
        return f"{len(files)}:{latest_mtime}"

    def _normalize(self, value: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_]+", "_", value.strip().replace(" ", "_")).strip("_").lower()

    def _safe_int(self, value: str | None, default: int) -> int:
        try:
            return int(value) if value is not None else default
        except Exception:
            return default

    def _safe_bool(self, value: str | None, default: bool) -> bool:
        if value is None:
            return default
        return str(value).strip().lower() in ("1", "true", "yes", "on")

    def _parse_csv(self, value: str | None) -> set[str]:
        if not value:
            return set()
        return {v.strip().lower() for v in value.split(",") if v.strip()}

    def _build_base_graph(self, wiki_dir: Path) -> dict[str, Any]:
        files = [f for f in wiki_dir.glob("*.md") if f.name not in ("index.md", "log.md")]
        nodes: list[dict[str, Any]] = []
        links: list[dict[str, Any]] = []
        node_ids: set[str] = set()
        node_canonical_map: dict[str, str] = {}
        ghost_nodes: dict[str, str] = {}
        link_pattern = re.compile(r"\[\[([^\]]+)\]\]")
        edge_weight: dict[tuple[str, str, str], int] = {}

        # First pass: concrete pages
        for md_file in files:
            title = md_file.stem
            canonical = self._normalize(title)
            content = md_file.read_text(encoding="utf-8")
            node_type = "concept"
            type_match = re.search(r"^type:\s*(.+)$", content, re.MULTILINE)
            if type_match:
                node_type = type_match.group(1).strip().strip("'").strip('"').lower()
            elif title.lower().startswith("source_") or "Source: " in content:
                node_type = "source"
            elif any(x in title.lower() for x in ["person", "org", "place", "event"]):
                node_type = "entity"

            node = {
                "id": title,
                "canonical_id": canonical,
                "name": title.replace("_", " "),
                "type": node_type,
                "val": 1.0,
                "summary": content[:150] + ("..." if len(content) > 150 else ""),
            }
            nodes.append(node)
            node_ids.add(title)
            node_canonical_map[canonical] = title

        # Second pass: links + sources + ghosts
        for md_file in files:
            source_id = md_file.stem
            content = md_file.read_text(encoding="utf-8")
            for target in link_pattern.findall(content):
                target_name = target.strip()
                target_slug = target_name.replace(" ", "_")
                canonical_target = self._normalize(target_slug)
                resolved_target = node_canonical_map.get(canonical_target, target_slug)
                if resolved_target == source_id:
                    continue
                if resolved_target in node_ids:
                    key = (source_id, resolved_target, "relates_to")
                    edge_weight[key] = edge_weight.get(key, 0) + 1
                else:
                    ghost_nodes[target_slug] = target_name
                    key = (source_id, target_slug, "ghost_link")
                    edge_weight[key] = edge_weight.get(key, 0) + 1

            src_match = re.search(r"^sources:\s*\[(.*?)\]", content, re.MULTILINE)
            if src_match and src_match.group(1).strip():
                for src in src_match.group(1).split(","):
                    src_clean = src.strip().strip("'").strip('"')
                    if not src_clean:
                        continue
                    src_slug = f"src_{self._normalize(src_clean)}"
                    if src_slug not in node_ids:
                        nodes.append({
                            "id": src_slug,
                            "canonical_id": self._normalize(src_slug),
                            "name": src_clean[:40] + ("..." if len(src_clean) > 40 else ""),
                            "type": "source",
                            "val": 1.2,
                            "summary": f"Referenced source: {src_clean}",
                        })
                        node_ids.add(src_slug)
                    key = (source_id, src_slug, "derived_from")
                    edge_weight[key] = edge_weight.get(key, 0) + 1

        for ghost_id, ghost_name in ghost_nodes.items():
            if ghost_id in node_ids:
                continue
            nodes.append({
                "id": ghost_id,
                "canonical_id": self._normalize(ghost_id),
                "name": ghost_name,
                "type": "ghost",
                "val": 0.8,
                "summary": "Mentioned in notes but no wiki page exists yet.",
            })
            node_ids.add(ghost_id)

        for (source, target, link_type), weight in edge_weight.items():
            links.append({"source": source, "target": target, "type": link_type, "weight": weight})

        return {"nodes": nodes, "links": links}

    def build_graph(self, wiki_dir: Path, params: dict[str, str | None]) -> dict[str, Any]:
        started = time.time()
        include_ghost = self._safe_bool(params.get("include_ghost"), True)
        focus = (params.get("focus") or "").strip()
        depth = max(1, self._safe_int(params.get("depth"), 1))
        min_degree = max(0, self._safe_int(params.get("min_degree"), 0))
        limit_nodes = max(1, self._safe_int(params.get("limit_nodes"), self._cfg("GRAPH_MAX_NODES", 3000)))
        limit_links = max(1, self._safe_int(params.get("limit_links"), self._cfg("GRAPH_MAX_LINKS", 6000)))
        wanted_types = self._parse_csv(params.get("node_types"))

        if not wiki_dir.exists():
            return {"nodes": [], "links": [], "stats": {"node_count": 0, "link_count": 0, "ghost_count": 0, "hub_count": 0, "orphan_count": 0}, "meta": {"truncated": False, "build_ms": 0, "revision": "missing"}}

        revision = self._revision_key(wiki_dir)
        cache_ttl = self._cfg("GRAPH_CACHE_TTL_SEC", 5)
        cache_key = f"{revision}"
        now = time.time()
        base_graph = None
        if cache_key in self._cache:
            ts, payload = self._cache[cache_key]
            if (now - ts) <= cache_ttl:
                base_graph = payload
        if base_graph is None:
            base_graph = self._build_base_graph(wiki_dir)
            self._cache[cache_key] = (now, base_graph)

        nodes = [dict(n) for n in base_graph["nodes"]]
        links = [dict(l) for l in base_graph["links"]]

        if not include_ghost:
            ghost_ids = {n["id"] for n in nodes if n.get("type") == "ghost"}
            nodes = [n for n in nodes if n["id"] not in ghost_ids]
            links = [l for l in links if l["source"] not in ghost_ids and l["target"] not in ghost_ids]

        if wanted_types:
            allowed = {n["id"] for n in nodes if n.get("type", "").lower() in wanted_types}
            nodes = [n for n in nodes if n["id"] in allowed]
            links = [l for l in links if l["source"] in allowed and l["target"] in allowed]

        degree_map = {n["id"]: 0.0 for n in nodes}
        in_degree = {n["id"]: 0 for n in nodes}
        out_degree = {n["id"]: 0 for n in nodes}
        for link in links:
            s, t, w = link["source"], link["target"], float(link.get("weight", 1))
            if t in degree_map:
                degree_map[t] += w
                in_degree[t] += int(w)
            if s in degree_map:
                degree_map[s] += 0.4 * w
                out_degree[s] += int(w)

        for n in nodes:
            deg = degree_map.get(n["id"], 0)
            n["degree"] = round(deg, 2)
            n["in_degree"] = in_degree.get(n["id"], 0)
            n["out_degree"] = out_degree.get(n["id"], 0)
            n["is_hub"] = deg >= 5
            n["is_orphan"] = (in_degree.get(n["id"], 0) == 0 and out_degree.get(n["id"], 0) == 0 and n.get("type") != "ghost")
            n["val"] = n.get("val", 1.0) + (deg * 0.5)

        if min_degree > 0:
            keep = {n["id"] for n in nodes if n.get("degree", 0) >= min_degree}
            nodes = [n for n in nodes if n["id"] in keep]
            links = [l for l in links if l["source"] in keep and l["target"] in keep]

        if focus:
            # Focus subgraph expansion by undirected BFS depth
            adjacency: dict[str, set[str]] = {}
            for l in links:
                adjacency.setdefault(l["source"], set()).add(l["target"])
                adjacency.setdefault(l["target"], set()).add(l["source"])
            if focus in adjacency:
                seen = {focus}
                q = deque([(focus, 0)])
                while q:
                    node_id, d = q.popleft()
                    if d >= depth:
                        continue
                    for nxt in adjacency.get(node_id, set()):
                        if nxt not in seen:
                            seen.add(nxt)
                            q.append((nxt, d + 1))
                nodes = [n for n in nodes if n["id"] in seen]
                links = [l for l in links if l["source"] in seen and l["target"] in seen]

        truncated = False
        if len(nodes) > limit_nodes:
            nodes = sorted(nodes, key=lambda n: n.get("degree", 0), reverse=True)[:limit_nodes]
            keep = {n["id"] for n in nodes}
            links = [l for l in links if l["source"] in keep and l["target"] in keep]
            truncated = True
        if len(links) > limit_links:
            links = sorted(links, key=lambda l: l.get("weight", 1), reverse=True)[:limit_links]
            truncated = True

        stats = {
            "node_count": len(nodes),
            "link_count": len(links),
            "ghost_count": sum(1 for n in nodes if n.get("type") == "ghost"),
            "hub_count": sum(1 for n in nodes if n.get("is_hub")),
            "orphan_count": sum(1 for n in nodes if n.get("is_orphan")),
        }
        meta = {
            "truncated": truncated,
            "build_ms": int((time.time() - started) * 1000),
            "revision": revision,
            "focus": focus or None,
            "depth": depth,
        }
        return {"nodes": nodes, "links": links, "stats": stats, "meta": meta}


graph_service = GraphService()

