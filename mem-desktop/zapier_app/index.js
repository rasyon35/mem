const Zapier = require('zapier-platform-core');

const BASE_URL = process.env.MEMOS_API_URL || 'http://localhost:8000/api';

const NewWikiPageTrigger = {
  key: 'new_page',
  noun: 'Wiki Page',
  display: {
    label: 'New Wiki Page',
    description: 'Triggers when a new wiki page is created in Memos.'
  },
  operation: {
    perform: async (z) => {
      const response = await z.request(`${BASE_URL}/wiki`);
      const data = await response.json();
      return data.pages.map((page) => ({
        id: page.title,
        title: page.title,
        description: page.description
      }));
    }
  }
};

const CreateWikiPage = {
  key: 'create_page',
  noun: 'Wiki Page',
  display: {
    label: 'Create or Update Wiki Page',
    description: 'Create or update a wiki page in Memos.'
  },
  operation: {
    inputFields: [
      { key: 'title', required: true, type: 'string', label: 'Title' },
      { key: 'content', required: true, type: 'text', label: 'Content' }
    ],
    perform: async (z, bundle) => {
      const response = await z.request({
        url: `${BASE_URL}/wiki/${encodeURIComponent(bundle.inputData.title)}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: { content: bundle.inputData.content }
      });
      return response.json();
    }
  }
};

module.exports = {
  version: require('./package.json').version,
  platformVersion: Zapier.version,
  triggers: {
    [NewWikiPageTrigger.key]: NewWikiPageTrigger
  },
  creates: {
    [CreateWikiPage.key]: CreateWikiPage
  }
};
