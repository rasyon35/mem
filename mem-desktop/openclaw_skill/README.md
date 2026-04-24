# OpenClaw Integration for Memos

This directory contains the integration code for connecting the external OpenClaw AI assistant with your Memos knowledge base.

## Setup Instructions

1. **Install OpenClaw** (if not already done):
   ```
   powershell -c "irm https://openclaw.ai/install.ps1 | iex"
   ```
   Follow the setup prompts to configure your LLM and chat integrations.

2. **Copy the Skill**:
   - Copy `openclaw_skill/index.js` to `~/.openclaw/skills/memos/index.js` (create the directories if needed).
   - Edit the `BASE_URL` in the file to match your Memos server (e.g., `http://localhost:8000/api` or your production URL).

3. **Restart OpenClaw**:
   - Restart OpenClaw to load the new skill.

4. **Onboard OpenClaw**:
   - In your chat with OpenClaw (e.g., Telegram), say: "I have a memos knowledge base. Use the memos skill to interact with it."
   - OpenClaw will now recognize functions like `queryWiki`, `updateWikiPage`, etc.

## Usage Examples

- **Query**: "What's in my memos about electrical installations?"
- **Update**: "Add a new section to the HSE policies about excavations."
- **Analyze**: "Run analysis on my wiki."
- **List**: "Show me all my wiki pages."

## Zapier Integration

The API now includes a webhook endpoint at `/api/zapier/webhook`.

- **In Zapier**: Create a Zap that sends POST requests to your Memos server URL + `/api/zapier/webhook`.
- **Payload Example**:
  ```json
  {
    "action": "ingest",
    "title": "New Email Summary",
    "content": "Content from Gmail..."
  }
  ```
- **Actions**:
  - `"ingest"`: Adds new content via the ingest pipeline.
  - `"update_page"`: Updates an existing wiki page.

## API Changes

- `GET/PUT /api/wiki/<title>`: Now supports updating pages via PUT.
- `POST /api/zapier/webhook`: New endpoint for Zapier webhooks.

## Security Notes

- For production, add authentication (e.g., API keys) to the endpoints.
- Ensure your server isn't exposed publicly without proper security.

## Testing

- Test locally: Use Postman to call the APIs.
- Test OpenClaw: Chat and verify responses.
- Test Zapier: Set up a test Zap and trigger it.