import json
import os
from pathlib import Path

ZAPIER_SOURCE_DIR = Path(__file__).resolve().parents[2] / 'zapier_app'
ZAPIER_INDEX_MARKER = '// BEGIN MEMOS ZAPIER INTEGRATION'

ZAPIER_APPEND_CODE = """
// BEGIN MEMOS ZAPIER INTEGRATION
const MEMOS_ZAPIER_BASE_URL = process.env.MEMOS_API_URL || 'http://localhost:8000/api';

const MEMOS_ZAPIER_INTEGRATION = {
  triggers: {
    new_memos_page: {
      key: 'new_memos_page',
      noun: 'Wiki Page',
      display: {
        label: 'New Memos Wiki Page',
        description: 'Triggers when a new wiki page is created in Memos.'
      },
      operation: {
        perform: async (z) => {
          const response = await z.request(`${MEMOS_ZAPIER_BASE_URL}/wiki`);
          const data = await response.json();
          return data.pages.map((page) => ({
            id: page.title,
            title: page.title,
            description: page.description
          }));
        }
      }
    }
  },
  creates: {
    create_memos_page: {
      key: 'create_memos_page',
      noun: 'Wiki Page',
      display: {
        label: 'Create or Update Memos Wiki Page',
        description: 'Create or update a wiki page in the Memos knowledge base.'
      },
      operation: {
        inputFields: [
          { key: 'title', required: true, type: 'string', label: 'Title' },
          { key: 'content', required: true, type: 'text', label: 'Content' }
        ],
        perform: async (z, bundle) => {
          const response = await z.request({
            url: `${MEMOS_ZAPIER_BASE_URL}/wiki/${encodeURIComponent(bundle.inputData.title)}`,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: { content: bundle.inputData.content }
          });
          return response.json();
        }
      }
    }
  }
};

try {
  const currentExport = module.exports || {};
  module.exports = {
    ...currentExport,
    triggers: {
      ...(currentExport.triggers || {}),
      ...MEMOS_ZAPIER_INTEGRATION.triggers
    },
    creates: {
      ...(currentExport.creates || {}),
      ...MEMOS_ZAPIER_INTEGRATION.creates
    }
  };
} catch (error) {
  console.error('Failed to append Memos Zapier integration:', error);
}
// END MEMOS ZAPIER INTEGRATION
"""


def get_zapier_dir() -> Path:
    target = os.getenv('ZAPIER_APP_PATH')
    if target:
        return Path(target).expanduser()
    return ZAPIER_SOURCE_DIR


def merge_package_json(target_path: Path) -> None:
    source_file = ZAPIER_SOURCE_DIR / 'package.json'
    target_file = target_path / 'package.json'

    if not target_file.exists():
        if source_file.exists():
            target_file.write_text(source_file.read_text(encoding='utf-8'), encoding='utf-8')
        return

    try:
        existing = json.loads(target_file.read_text(encoding='utf-8'))
        source = json.loads(source_file.read_text(encoding='utf-8'))
        existing_deps = existing.get('dependencies', {})
        source_deps = source.get('dependencies', {})

        changed = False
        for name, version in source_deps.items():
            if existing_deps.get(name) != version:
                existing_deps[name] = version
                changed = True

        if changed:
            existing['dependencies'] = existing_deps
            target_file.write_text(json.dumps(existing, indent=2), encoding='utf-8')
    except Exception as e:
        print(f'Zapier package.json merge failed: {e}')


def append_index_js(target_path: Path) -> None:
    src_file = ZAPIER_SOURCE_DIR / 'index.js'
    target_file = target_path / 'index.js'

    if not target_file.exists():
        if src_file.exists():
            target_file.write_text(src_file.read_text(encoding='utf-8'), encoding='utf-8')
        return

    content = target_file.read_text(encoding='utf-8')
    if ZAPIER_INDEX_MARKER in content:
        return

    content += '\n\n' + ZAPIER_APPEND_CODE
    target_file.write_text(content, encoding='utf-8')


def ensure_zapier_integration() -> None:
    target_dir = get_zapier_dir()
    target_dir.mkdir(parents=True, exist_ok=True)

    merge_package_json(target_dir)
    append_index_js(target_dir)

    readme_source = ZAPIER_SOURCE_DIR / 'README.md'
    target_readme = target_dir / 'README.md'
    if not target_readme.exists() and readme_source.exists():
        target_readme.write_text(readme_source.read_text(encoding='utf-8'), encoding='utf-8')

    print(f'Zapier integration ensured at {target_dir}')
