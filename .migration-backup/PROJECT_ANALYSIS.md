# MEM Project - Deep Analysis

## 📋 Project Overview

**MEM** is a sophisticated knowledge management and document ingestion system with both a desktop application and a public waitlist landing page. It's designed to help users create, manage, and maintain a comprehensive knowledge base with AI-powered features, contradiction detection, and semantic indexing.

**Repository**: abrham17/mem (GitHub)  
**Status**: Active development with recent features (AI evolver, Obsidian-like editor, light mode, graph visualizer)

---

## 🏗️ Architecture

The project is organized into **2 main applications**:

### 1. **mem-desktop** (Full-stack knowledge management app)
   - **Frontend**: Next.js 16 (TypeScript, React 19.2.4)
   - **Backend**: Django REST API (Python)
   - **Desktop**: Electron for desktop packaging
   - **Status**: Core MVP features - local-first workflows only

### 2. **memos-waitlist** (Public landing page)
   - **Frontend**: Next.js 16 (TypeScript, React 19.2.4)
   - **Purpose**: Marketing/waitlist capture
   - **Structure**: Simple landing with Navbar, Hero, Features, WaitlistForm, Footer

---

## 📦 Technology Stack

### **Frontend (mem-desktop/frontend)**
```
- Next.js 16.2.4
- React 19.2.4
- TypeScript
- Custom CSS (tokens-based theming)
- Electron (for desktop)
- Axios (HTTP client)
```

### **Backend (mem-desktop/backend)**
```
- Django 4.2+
- Django REST Framework
- PostgreSQL (implied from Django setup)
- Celery + Redis (async task processing)
- Groq (LLM integration)
- ChromaDB (vector search/semantic indexing)
- GitPython (git integration)
- PDF/Document processing: PyPDF2, pdfplumber, python-docx
- HTML parsing: BeautifulSoup4, html2text
- Sentence Transformers (embeddings)
- XPath/XML processing
```

### **Key Infrastructure**
- **Vector Store**: ChromaDB (local embeddings with sentence-transformers)
- **LLM Provider**: Groq (fast inference)
- **Task Queue**: Celery + Redis
- **Git Integration**: GitPython for version control

---

## 📂 Directory Structure

### mem-desktop/backend
```
├── backend/              # Django settings & config
│   ├── settings.py      # Main Django config
│   ├── urls.py          # API routing
│   ├── celery.py        # Async task config
│   └── wsgi.py / asgi.py
├── core/                # Core app (unused in models shown)
├── ingest/              # Main ingestion & processing app
│   ├── models.py        # 14 core data models
│   ├── ai_client.py     # LLM integration
│   ├── groq_client.py   # Groq-specific implementation
│   ├── processor.py     # Document processing
│   ├── extractors.py    # Format-specific extractors
│   ├── semantic_index.py # ChromaDB integration
│   ├── git_server.py    # Git integration
│   ├── graph_service.py # Knowledge graph
│   ├── tasks.py         # Celery async tasks
│   ├── views.py         # Main API endpoints
│   ├── views_collab.py  # Collaboration features
│   ├── views_lint.py    # Linting/quality checks
│   ├── policy.py        # Policy evaluation
│   └── wiki_context.py  # Context generation
├── knowledge/           # Knowledge base management
│   ├── models.py
│   ├── ontology.py      # Knowledge graph structure
│   ├── wiki_projection.py
│   └── management/
│       └── commands/
│           └── sync_markdown_wiki.py
└── requirements.txt
```

### mem-desktop/frontend
```
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── chat/           # Chat interface
│   │   │   ├── collab/         # Collaboration
│   │   │   ├── graph/          # Knowledge graph visualization
│   │   │   ├── ingest/         # Document ingestion
│   │   │   ├── markdown/       # Markdown editor
│   │   │   ├── settings/       # Management & configuration
│   │   │   ├── timeline/       # History/timeline
│   │   │   └── layout.tsx      # Dashboard container
│   │   ├── css/                # Theming & styling
│   │   │   ├── tokens.css      # Design tokens
│   │   │   ├── collision.css   # Specific components
│   │   │   └── features.css
│   │   ├── page.tsx            # Root page (redirects to /dashboard/ingest)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── wiki-v2/            # Obsidian-like editor components
│   │   │   ├── KnowledgeStudio.tsx
│   │   │   ├── PageEditor.tsx
│   │   │   ├── GoogleDocsEditor.tsx
│   │   │   ├── OpenMarkdown.tsx
│   │   │   └── ...
│   │   ├── ChatCitationCard.tsx
│   │   ├── CollisionWizard.tsx
│   │   ├── GraphViewer.tsx
│   │   ├── Sidebar.tsx
│   │   └── Icons.tsx
│   ├── context/
│   │   ├── WikiContext.tsx     # Global wiki state
│   │   └── ThemeContext.tsx
│   └── app.css (global styling)
```

---

## 🗄️ Database Schema

### Core Models (ingest/models.py)

**Source Management**
- `Source`: Documents/URLs ingested (name, type, URL, reliability_score 1-5)
- `RawArtifactLedger`: Immutable ledger of ingested files (sha256, MIME type, canonical path)

**Knowledge Storage**
- `KnowledgeClaim`: Individual facts/claims with status (active/superseded/contested)
- `ClaimRevision`: Audit trail for claim changes
- `QueryArtifact`: Generated responses with citations
- `ArtifactRevision`: Revision history for artifacts

**Conflict Resolution**
- `Contradiction`: Detected conflicts between sources (with status: pending/accepted/dismissed)
- `PageSource`: Maps pages to source evidence

**Quality Assurance**
- `PolicyEvaluation`: Security/policy checks on ingested content (hard/soft gates, risk_score)
- `CriticalPage`: Manually marked pages requiring review
- `LintRun`: Batch quality checks
- `LintFinding`: Individual quality issues with auto-fix capability
- `LintAction`: Applied fixes/actions

**Task Management**
- `RemediationTask`: Work items (open/in_progress/done/dismissed)

---

## 🎯 Core Features (by Dashboard Section)

### 1. **Ingest** (`/dashboard/ingest`)
- Upload/add documents (PDFs, Word docs, Markdown, HTML, URLs)
- Process with document-specific extractors
- Store immutable artifact ledgers with checksums
- Run policy evaluations
- Detect contradictions with existing knowledge

### 2. **Wiki/Markdown** (`/dashboard/markdown`)
- Obsidian-like editor for creating/editing pages
- Support for tags, links, embeddings
- Real-time synchronization with backend
- Page organization by categories

### 3. **Chat** (`/dashboard/chat`)
- Query the knowledge base with natural language
- Citation cards showing source evidence
- Context-aware responses using wiki content

### 4. **Graph** (`/dashboard/graph`)
- Visualize knowledge graph/connections
- Interactive exploration of relationships
- Map-based visualization (recent update)

### 5. **Collaboration** (`/dashboard/collab`)
- Multi-user collaboration features
- Real-time updates

### 6. **Timeline** (`/dashboard/timeline`)
- Historical view of changes
- Version history tracking

### 7. **Settings** (`/dashboard/settings`)
- **Preferences**: Auto-approve toggle for non-critical updates
- **Data Export**: Download ZIP archive or publish to public docs
- **Product Scope**: Notes about MVP focus
- **KPI Snapshot**: Local event counters (ingest, approvals, chats, page opens)
- **Category Organization**: AI-powered bulk reorganization with LLM
- **Contradiction Hub**: Review and resolve conflicting claims
- **Critical Pages**: Mark pages that require review approval

---

## 🧠 AI & Processing Pipeline

### Document Processing Flow
1. **Ingest** → Extract text from various formats (PDF, DOCX, Markdown, HTML, etc.)
2. **Policy Check** → Evaluate security/reliability policies (hard/soft gates)
3. **Semantic Index** → Generate embeddings with Sentence Transformers + ChromaDB
4. **Contradiction Detection** → Compare against existing claims using Groq LLM
5. **Store** → Create KnowledgeClaim entries with citations
6. **Lint** → Run quality checks for completeness, consistency, etc.

### AI Features
- **Groq Integration**: Fast LLM inference for contradictions, reorganization, chat
- **Semantic Search**: ChromaDB for vector-based retrieval
- **Embeddings**: Sentence Transformers for text representation
- **Background Evolution**: AI evolver continuously analyzes changes (recent feature)

### Async Processing
- **Celery Tasks**: Background jobs for heavy lifting
- **Redis Queue**: Task coordination
- **Event Metrics**: Local tracking of frontend events (ingest, approvals, etc.)

---

## 🎨 Theming & UI

### Design System
- **Custom CSS tokens** in `css/tokens.css`:
  - Primary, secondary, accent colors
  - Dark mode (default) and light mode support
  - Semantic design tokens (text-primary, bg-900, etc.)
- **Component-specific styling**: collision.css, features.css, layout.css, ui-components.css
- **ThemeContext**: React context for theme switching

### UI Components
- **Custom components**: ChatSidebar, GraphViewer, Sidebar, Icons
- **WikiV2 Components**: Obsidian-inspired editor with PageEditor, GoogleDocsEditor, etc.
- **Responsive layouts**: Mobile-first, collapsible sidebar (recent update)

---

## 🚀 Recent Development Activity

| Commit | Feature |
|--------|---------|
| `8cd26a8` | Merge PR #6 (ingest/ai) |
| `bea5b0b` | **Obsidian-like editor** implementation |
| `3de32e5` | Merge PR #5 (rasyon35) |
| `ed1af9c` | **OpenClaw + Zapier integration** |
| `ff49097` | Merge PR #4 (ingest/ai) |
| `a4f933f` | **AI evolver** - continuous background analysis |
| `c51bbe1` | Merge PR #3 |
| `ad9b8df` | **Light mode, collapsible sidebar, graph→map visualizer** |
| `8b3f3cd` | Merge PR #2 |

### Key Initiatives
1. ✅ Enhanced editor with Obsidian-like interface
2. ✅ External integrations (OpenClaw, Zapier)
3. ✅ Autonomous AI evolution in background
4. ✅ Improved UX (light mode, collapsible sidebar)
5. ✅ Better visualization (map-based graph)

---

## 🔧 Development Workflow

### Running the Application

**Desktop App (all services)**:
```bash
npm run dev  # Concurrent: backend (8000), frontend (3000), electron
```

**Individual Services**:
```bash
npm run dev:backend    # Django on :8000
npm run dev:frontend   # Next.js on :3000
npm run dev:electron   # Electron app
```

### Environment Setup
- **Backend**: Python venv + dependencies in `requirements.txt`
- **Frontend**: npm packages in `package.json`
- **Electron**: Node.js + package.json

---

## 📊 Data Flow Architecture

```
User Input (Desktop/Web)
    ↓
Frontend (Next.js)
    ↓
Django REST API (:8000)
    ├─→ Ingest Pipeline
    │   ├─→ Format Extraction (PDF, DOCX, etc.)
    │   ├─→ Policy Evaluation (Risk scoring)
    │   └─→ Semantic Indexing (ChromaDB + Sentence Transformers)
    │
    ├─→ Contradiction Detection
    │   └─→ Groq LLM (fast inference)
    │
    ├─→ Knowledge Graph
    │   └─→ Graph Service + Ontology
    │
    ├─→ Chat/Query Engine
    │   ├─→ Semantic search (ChromaDB)
    │   └─→ Response generation (Groq)
    │
    └─→ Async Tasks (Celery + Redis)
        └─→ Background: AI evolution, PDF export, publishing

Database (PostgreSQL implied)
    └─→ All models persisted

File System
    └─→ Workspace: ChromaDB indices, artifacts
```

---

## 🔐 Security & Quality Features

- **Policy Evaluation**: Hard/soft gates on content ingestion
- **Risk Scoring**: 1-5 reliability scores per source
- **Critical Pages**: Require explicit approval for changes
- **Contradiction Resolution**: Manual review of conflicting claims
- **Immutable Ledger**: RawArtifactLedger prevents tampering
- **Lint System**: Automated quality checks with auto-fix capability
- **Status Tracking**: Pending/accepted/dismissed workflow for changes

---

## 📈 MVP Scope

**Included** (local-first):
- ✅ Document ingest from multiple formats
- ✅ Wiki creation & editing
- ✅ Semantic search & chat
- ✅ Contradiction detection
- ✅ Quality linting
- ✅ Export/archival
- ✅ Public site publishing

**Excluded** (intentionally):
- ❌ External automation agents
- ❌ Autonomous agents
- ❌ Real-time multi-user sync (basic collab only)
- ❌ Advanced integrations (beyond OpenClaw, Zapier)

---

## 🎯 Key Insights & Opportunities

### Strengths
1. **Comprehensive knowledge management** - Full pipeline from ingestion to export
2. **AI-powered intelligence** - Groq LLM for contradictions, evolution, chat
3. **Quality-first design** - Multiple validation layers (policy, lint, critical pages)
4. **Flexible formats** - Supports PDF, Word, Markdown, HTML, URLs
5. **Semantic capabilities** - Vector search with modern embeddings
6. **Desktop + Web** - Electron packaging + web interface

### Potential Enhancements
1. **Database**: Explicit PostgreSQL schema setup
2. **Auth**: User authentication (if multi-tenant)
3. **Real-time**: WebSocket support for live collaboration
4. **Scaling**: Async job queue optimization for bulk processing
5. **Export**: Additional format support (AsciiDoc, etc.)
6. **Analytics**: Dashboard for knowledge base metrics
7. **Integrations**: More content sources (Slack, GitHub, etc.)

---

## 📝 Summary

**MEM** is a sophisticated, feature-rich knowledge management system focused on quality, correctness, and semantic understanding. It combines modern AI (Groq, embeddings), traditional software engineering (Django, Next.js), and a thoughtful UX (Obsidian-like editor, light mode) to create a comprehensive solution for knowledge workers and teams.

The project is well-structured, actively developed, and demonstrates strong architectural patterns with clear separation of concerns, async processing, and multi-layered quality assurance.
