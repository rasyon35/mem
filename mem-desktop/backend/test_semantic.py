import os
import sys

# Setup Django environment
sys.path.append('/home/abrhame/projects/mem/mem-desktop/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from ingest.semantic_index import semantic_index

def run_indexing():
    print("Starting full-wiki semantic indexing...")
    success = semantic_index.index_all(force=True)
    if success:
        print("Success! Wiki successfully indexed semantically.")
        
        # Test a search
        test_query = "information about NARS mechanics"
        print(f"\nTesting search with query: '{test_query}'")
        results = semantic_index.search(test_query, top_k=3)
        for title, score in results:
            print(f"- {title} (Score: {score:.4f})")
    else:
        print("Indexing failed or no pages found.")

if __name__ == "__main__":
    run_indexing()
