// OpenClaw Skill for Memos Integration
// Copy this file to ~/.openclaw/skills/memos/index.js
// Then restart OpenClaw and say "I have a memos knowledge base at http://localhost:8000/api"

const BASE_URL = 'http://localhost:8000/api'; // Change this to your memos server URL

module.exports = {
  name: 'Memos Knowledge Base',
  description: 'Interact with the Memos wiki system: query pages, manage proposals, and ingest content.',

  functions: {
    // Query the wiki semantically
    async queryWiki(query) {
      const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      return data.response || 'No results found.';
    },

    // List all wiki pages
    async listWikiPages() {
      const response = await fetch(`${BASE_URL}/wiki`);
      const data = await response.json();
      return data.pages || [];
    },

    // Get a specific wiki page
    async getWikiPage(title) {
      const response = await fetch(`${BASE_URL}/wiki/${encodeURIComponent(title)}`);
      if (response.ok) {
        const data = await response.json();
        return data.content;
      } else {
        return `Page "${title}" not found.`;
      }
    },

    // Update or create a wiki page
    async updateWikiPage(title, content) {
      const response = await fetch(`${BASE_URL}/wiki/${encodeURIComponent(title)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      return response.ok ? 'Page updated.' : 'Update failed.';
    },

    // Ingest new content (e.g., add a page or update)
    async ingestContent(content, title = 'New Page') {
      const response = await fetch(`${BASE_URL}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title })
      });
      const data = await response.json();
      return data.message || 'Content ingested.';
    },

    // List pending OpenClaw proposals
    async listProposals() {
      const response = await fetch(`${BASE_URL}/openclaw/proposals`);
      const data = await response.json();
      return data.proposals || [];
    },

    // Handle a proposal (approve or dismiss)
    async handleProposal(proposalId, action) { // action: 'apply' or 'dismiss'
      const response = await fetch(`${BASE_URL}/openclaw/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposalId, action })
      });
      const data = await response.json();
      return data.status || 'Proposal handled.';
    },

    // Trigger internal OpenClaw analysis
    async triggerAnalysis() {
      const response = await fetch(`${BASE_URL}/openclaw/evolve`, {
        method: 'POST'
      });
      const data = await response.json();
      return data.results || 'Analysis triggered.';
    },

    // Get git history
    async getHistory() {
      const response = await fetch(`${BASE_URL}/history`);
      const data = await response.json();
      return data.history || [];
    }
  }
};