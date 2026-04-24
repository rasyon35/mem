# Memos Zapier Integration

This directory contains a sample Zapier app that integrates with your Memos backend.

## Setup

1. Install Zapier CLI if you haven't already:
   ```bash
   npm install -g zapier-platform-cli
   ```

2. From this directory:
   ```bash
   npm install
   zapier register
   zapier push
   ```

3. Use the app in Zapier to create triggers and actions for your Memos knowledge base.

## Environment

- `MEMOS_API_URL` should point to your backend API, e.g. `http://localhost:8000/api`.

## Manual integration

This Zapier integration is manual. After you install the Zapier app and configure the repo, run the Django management command from the backend:

```bash
python manage.py ensure_zapier_integration
```

That command writes the Zapier app scaffold or appends the Memos integration code without overwriting your existing Zapier setup.

## Included features

- Trigger: `New Wiki Page`
- Create: `Create or Update Wiki Page`
