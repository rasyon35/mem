import re
from pathlib import Path

wiki_dir = Path("/home/abrhame/projects/mem/mem-desktop/workspace/wiki")

category_mapping = {
    "Operating Systems": ["Process", "Multiprogramming", "CPU", "Interrupt", "Scheduling", "Synchronization", "Occupancy"],
    "Algorithms": ["Sort", "Algorithm", "Heap", "Quick", "Merge"],
    "AGI & Cognitive": ["NARS", "AGI", "Artificial General Intelligence", "OpenCog", "Non-Axiomatic", "Pei Wang", "Ben Goertzel", "Nil Geisweiller", "PLN", "Hyperon", "Artificial Intelligence", "Cognitive", "Symbol Grounding", "Autonomous Agent"],
    "Logic & Reasoning": ["Logic", "Syllogism", "Abduction", "Deduction", "Induction", "Inference", "Tarski", "Predicate", "Propositional", "Reasoning", "Formal", "Non-Monotonic", "Modal", "Deontic", "Fuzzy", "Calculus", "SAT Solvers", "Semantics", "Truth"],
    "Software & Systems": ["End-to-End", "Extract", "Transform", "Create", "Read", "Protocol", "Framework", "System", "Cloud", "Library", "Architecture", "JavaScript", "JSON", "RPC", "IT Service"],
    "AI Tech": ["Generative", "Language Model", "Function Calling", "RAG", "Retrieval", "Context-Aware", "Contextual"],
    "Finance": ["Finance", "Financial", "Merchant", "Exchange"],
}

for md_file in wiki_dir.glob("*.md"):
    if md_file.name in ("index.md", "log.md"):
        continue
        
    content = md_file.read_text(encoding="utf-8")
    lower_content = content.lower()
    
    assigned_cat = "Miscellaneous"
    
    # Try to match based on title or content
    for cat, keywords in category_mapping.items():
        if any(kw.lower() in lower_content for kw in keywords) or any(kw.lower() in md_file.name.lower() for kw in keywords):
            assigned_cat = cat
            break
            
    # Inject category into frontmatter if not present
    if "category:" not in content:
        # Frontmatter is between --- and ---
        if content.startswith("---"):
            lines = content.split("\n")
            end_idx = 0
            for i in range(1, len(lines)):
                if lines[i].startswith("---"):
                    end_idx = i
                    break
            
            if end_idx > 0:
                lines.insert(end_idx, f"category: {assigned_cat}")
                content = "\n".join(lines)
                md_file.write_text(content, encoding="utf-8")

print("Done categorizing!")
