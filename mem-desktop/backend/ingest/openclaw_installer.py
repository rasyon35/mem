import os
import platform
import subprocess
import shutil
import threading
from pathlib import Path

OPENCLAW_SKILL_NAME = "memos"
OPENCLAW_INSTALLER_URL_WINDOWS = "https://openclaw.ai/install.ps1"
OPENCLAW_INSTALLER_URL_UNIX = "https://openclaw.ai/install.sh"
OPENCLAW_AUTO_INSTALL = os.getenv('OPENCLAW_AUTO_INSTALL', 'true').lower() != 'false'

SKILL_SOURCE_PATH = Path(__file__).resolve().parents[2] / 'openclaw_skill' / 'index.js'

OPENCLAW_SKILL_CONTENT = """const BASE_URL = process.env.OPENCLAW_MEMOS_URL || 'http://localhost:8000/api';

module.exports = {
  name: 'Memos Knowledge Base',
  description: 'Interact with the Memos wiki system: query pages, manage proposals, and ingest content.',

  functions: {
    async queryWiki(query) {
      const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      return data.response || 'No results found.';
    },

    async listWikiPages() {
      const response = await fetch(`${BASE_URL}/wiki`);
      const data = await response.json();
      return data.pages || [];
    },

    async getWikiPage(title) {
      const response = await fetch(`${BASE_URL}/wiki/${encodeURIComponent(title)}`);
      if (response.ok) {
        const data = await response.json();
        return data.content;
      } else {
        return `Page "${title}" not found.`;
      }
    },

    async updateWikiPage(title, content) {
      const response = await fetch(`${BASE_URL}/wiki/${encodeURIComponent(title)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      return response.ok ? 'Page updated.' : 'Update failed.';
    },

    async listProposals() {
      const response = await fetch(`${BASE_URL}/openclaw/proposals`);
      const data = await response.json();
      return data.proposals || [];
    },

    async handleProposal(proposalId, action) {
      const response = await fetch(`${BASE_URL}/openclaw/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposalId, action })
      });
      const data = await response.json();
      return data.status || 'Proposal handled.';
    },

    async triggerAnalysis() {
      const response = await fetch(`${BASE_URL}/openclaw/evolve`, {
        method: 'POST'
      });
      const data = await response.json();
      return data.results || 'Analysis triggered.';
    },

    async getHistory() {
      const response = await fetch(`${BASE_URL}/history`);
      const data = await response.json();
      return data.history || [];
    }
  }
};"""

OPENCLAW_SKILL_APPEND = """
// BEGIN MEMOS OPENCLAW SKILL
const MEMOS_OPENCLAW_BASE_URL = process.env.OPENCLAW_MEMOS_URL || 'http://localhost:8000/api';

const MEMOS_OPENCLAW_SKILL = {
  name: 'Memos Knowledge Base',
  description: 'Interact with the Memos wiki system: query pages, manage proposals, and ingest content.',

  functions: {
    async queryWiki(query) {
      const response = await fetch(`${MEMOS_OPENCLAW_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      return data.response || 'No results found.';
    },

    async listWikiPages() {
      const response = await fetch(`${MEMOS_OPENCLAW_BASE_URL}/wiki`);
      const data = await response.json();
      return data.pages || [];
    },

    async getWikiPage(title) {
      const response = await fetch(`${MEMOS_OPENCLAW_BASE_URL}/wiki/${encodeURIComponent(title)}`);
      if (response.ok) {
        const data = await response.json();
        return data.content;
      } else {
        return `Page "${title}" not found.`;
      }
    },

    async updateWikiPage(title, content) {
      const response = await fetch(`${MEMOS_OPENCLAW_BASE_URL}/wiki/${encodeURIComponent(title)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      return response.ok ? 'Page updated.' : 'Update failed.';
    },

    async listProposals() {
      const response = await fetch(`${MEMOS_OPENCLAW_BASE_URL}/openclaw/proposals`);
      const data = await response.json();
      return data.proposals || [];
    },

    async handleProposal(proposalId, action) {
      const response = await fetch(`${MEMOS_OPENCLAW_BASE_URL}/openclaw/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposalId, action })
      });
      const data = await response.json();
      return data.status || 'Proposal handled.';
    },

    async triggerAnalysis() {
      const response = await fetch(`${MEMOS_OPENCLAW_BASE_URL}/openclaw/evolve`, {
        method: 'POST'
      });
      const data = await response.json();
      return data.results || 'Analysis triggered.';
    },

    async getHistory() {
      const response = await fetch(`${MEMOS_OPENCLAW_BASE_URL}/history`);
      const data = await response.json();
      return data.history || [];
    }
  }
};

function _appendMemosSkill(existing) {
  if (!existing) {
    return MEMOS_OPENCLAW_SKILL;
  }

  if (Array.isArray(existing)) {
    if (!existing.some((item) => item && item.name === MEMOS_OPENCLAW_SKILL.name)) {
      existing.push(MEMOS_OPENCLAW_SKILL);
    }
    return existing;
  }

  if (existing.name === MEMOS_OPENCLAW_SKILL.name) {
    return existing;
  }

  return [existing, MEMOS_OPENCLAW_SKILL];
}

try {
  module.exports = _appendMemosSkill(module.exports);
} catch (error) {
  console.error('Failed to append Memos skill to existing OpenClaw skill file:', error);
}
// END MEMOS OPENCLAW SKILL
"""


def get_openclaw_home() -> Path:
    custom_home = os.getenv('OPENCLAW_HOME')
    if custom_home:
        return Path(custom_home).expanduser()
    return Path.home() / '.openclaw'


def is_openclaw_installed() -> bool:
    if shutil_which('openclaw'):
        return True
    openclaw_home = get_openclaw_home()
    return openclaw_home.exists()


def shutil_which(command: str) -> bool:
    try:
        from shutil import which
        return which(command) is not None
    except Exception:
        return False


def install_openclaw() -> None:
    system = platform.system().lower()
    if system == 'windows':
        cmd = [
            'powershell',
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            f"irm {OPENCLAW_INSTALLER_URL_WINDOWS} | iex"
        ]
    else:
        cmd = [
            '/bin/bash',
            '-lc',
            f"curl -fsSL {OPENCLAW_INSTALLER_URL_UNIX} | bash"
        ]

    subprocess.run(cmd, check=True)


def get_skill_dir() -> Path:
    openclaw_home = get_openclaw_home()
    return openclaw_home / 'skills' / OPENCLAW_SKILL_NAME


def load_skill_content() -> str:
    try:
        if SKILL_SOURCE_PATH.exists():
            return SKILL_SOURCE_PATH.read_text(encoding='utf-8')
    except Exception:
        pass
    return OPENCLAW_SKILL_CONTENT


def deploy_openclaw_skill() -> Path:
    skill_dir = get_skill_dir()
    skill_dir.mkdir(parents=True, exist_ok=True)
    skill_file = skill_dir / 'index.js'

    if skill_file.exists():
        existing = skill_file.read_text(encoding='utf-8')
        if 'BEGIN MEMOS OPENCLAW SKILL' in existing:
            return skill_file
        skill_file.write_text(existing + '\n\n' + OPENCLAW_SKILL_APPEND, encoding='utf-8')
        return skill_file

    skill_file.write_text(load_skill_content(), encoding='utf-8')
    return skill_file


def _background_install_and_deploy() -> None:
    try:
        if not is_openclaw_installed():
            print('OpenClaw not found. Installing OpenClaw in background...')
            install_openclaw()
            print('OpenClaw installation complete.')
    except Exception as e:
        print(f'OpenClaw installation failed: {e}')

    try:
        deployed_skill = deploy_openclaw_skill()
        print(f'OpenClaw skill deployed to {deployed_skill}')
    except Exception as e:
        print(f'Failed to deploy OpenClaw skill: {e}')


def ensure_openclaw_background() -> None:
    try:
        if not OPENCLAW_AUTO_INSTALL:
            print('OpenClaw auto-install disabled by OPENCLAW_AUTO_INSTALL=false')
            try:
                deployed_skill = deploy_openclaw_skill()
                print(f'OpenClaw skill deployed to {deployed_skill}')
            except Exception as e:
                print(f'Failed to deploy OpenClaw skill: {e}')
            return

        installed = is_openclaw_installed()
        if installed:
            deployed_skill = deploy_openclaw_skill()
            print(f'OpenClaw skill deployed to {deployed_skill}')
            return

        thread = threading.Thread(target=_background_install_and_deploy, daemon=True)
        thread.start()
    except Exception as e:
        print(f'OpenClaw background setup failed: {e}')
