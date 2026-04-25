# User Development Package — GenAI Virtual Teaching Assistant (VTA)

**Project Title:** GenAI Assisted Virtual Classroom  
**Author:** Argel  
**Date:** April 2026  
**Course:** NTU Final Year Project (Y4S1)  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Source Code](#2-source-code)
3. [Software, Tools & Frameworks Used](#3-software-tools--frameworks-used)
4. [Software Versions & URLs](#4-software-versions--urls)
5. [Cloud Services](#5-cloud-services)
6. [Installation Procedure](#6-installation-procedure)
7. [Environment Parameters](#7-environment-parameters)
8. [Key Folders and Files](#8-key-folders-and-files)
9. [Major Functions & Key Points](#9-major-functions--key-points)
10. [Running the Application](#10-running-the-application)
11. [Deployment (Production)](#11-deployment-production)
12. [Troubleshooting & Key Notes](#12-troubleshooting--key-notes)

---

## 1. Project Overview

A full-stack GenAI-powered virtual classroom with:
- **RAG-based Q&A** — students ask questions and get cited answers from uploaded course materials
- **Persona-driven discussions** — four AI personas (Standard, Devil's Advocate, Joker, Socratic)
- **Gamified learning** — AI-generated flashcards, quizzes, summaries (Duolingo-style)
- **Interactive learning modes** — Socratic tutoring, teach-back, concept maps, scenario-based learning, illustrated flashcards, revision from mistakes
- **Curriculum planning** — AI-generated study plans with calendar view
- **Voice interaction** — text-to-speech and speech-to-text via Azure OpenAI
- **Professor dashboard** — upload materials, manage courses, view analytics
- **Student analytics** — engagement tracking, topic heatmaps, at-risk alerts
- **Multi-theme UI** — Professional, Playful (young learners), Classic themes
- **OTP-based authentication** — email verification, role-based access (student/professor)

**Architecture:**
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Radix UI
- **Backend:** FastAPI + SQLAlchemy 2 + MySQL + LangChain + FAISS + Azure OpenAI
- **Deployment:** Docker containers on Azure App Service, CI/CD via GitHub Actions

---

## 2. Source Code

### Repository Structure

```
virtual-teaching-assistant/
├── backend/                    # FastAPI backend (Python)
│   ├── main.py                 # App entry point, router registration, startup
│   ├── settings.py             # Pydantic settings (env config)
│   ├── db.py                   # SQLAlchemy engine, DB init
│   ├── models.py               # ORM models (users, sessions, logs, curriculum)
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── repositories.py         # Data access helpers
│   ├── rag_core/               # RAG pipeline (ingestion, retrieval, chain)
│   │   ├── config.py           # Azure OpenAI settings dataclass
│   │   ├── ingestion.py        # Document loading + FAISS index building
│   │   ├── retrieval.py        # FAISS retriever (MMR) loading
│   │   ├── chain.py            # LangChain RAG chain + persona prompts
│   │   └── schemas.py          # Answer, Source, ChunkDetail models
│   ├── routers/                # API route modules
│   │   ├── auth.py             # OTP login, sessions, registration
│   │   ├── rag.py              # Q&A, course listing, index reload
│   │   ├── documents.py        # File upload/list/delete
│   │   ├── indexing.py         # Index build/status
│   │   ├── content.py          # Flashcards, quiz, summary generation
│   │   ├── interactive.py      # Socratic, teach-back, concept-map, etc.
│   │   ├── media.py            # TTS and STT endpoints
│   │   ├── analytics.py        # Event/query logging and analytics
│   │   └── curriculum.py       # Curriculum CRUD and AI planning
│   ├── utils/                  # Utility modules
│   │   ├── otp.py              # OTP generation and validation
│   │   ├── security.py         # JWT tokens, hashing, sessions
│   │   ├── email_client.py     # Azure Communication Services email
│   │   └── blob_storage.py     # Azure Blob Storage for indexes
│   ├── services/               # Business logic
│   │   └── planner.py          # AI curriculum planning
│   ├── scripts/                # CLI utilities
│   │   ├── ingest.py           # Offline document ingestion
│   │   ├── ask.py              # CLI Q&A testing
│   │   ├── diagnose.py         # Environment diagnostics
│   │   └── evaluate.py         # RAG evaluation harness
│   ├── tests/                  # Pytest test suite
│   ├── data/                   # Uploaded course documents (gitignored)
│   ├── index/                  # FAISS vector indexes (gitignored)
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Backend container build
│   └── pytest.ini              # Test configuration
│
├── frontend/                   # Next.js frontend (TypeScript)
│   ├── app/                    # App Router pages and layouts
│   │   ├── layout.tsx          # Root layout (themes, auth, fonts)
│   │   ├── page.tsx            # Home (redirects to /login)
│   │   ├── globals.css         # Global CSS, design tokens, animations
│   │   ├── login/page.tsx      # OTP login/registration page
│   │   └── (dashboard)/        # Authenticated dashboard routes
│   │       ├── layout.tsx      # Dashboard shell (navbar, sidebar)
│   │       ├── chat/           # RAG chat page
│   │       ├── student/        # Student home page
│   │       ├── professor/      # Professor console
│   │       ├── personas/       # Persona Q&A page
│   │       ├── learn/          # Flashcards, quiz, summary
│   │       ├── curriculum/     # Curriculum planner
│   │       ├── socratic/       # Socratic tutoring
│   │       ├── teach-back/     # Teach-it-back mode
│   │       ├── concept-map/    # Interactive concept maps
│   │       ├── scenarios/      # Scenario-based learning
│   │       ├── illustrated/    # Illustrated flashcards
│   │       ├── revision/       # Mistake journal + revision
│   │       └── analytics/      # Professor analytics dashboard
│   ├── components/             # UI and feature components
│   │   ├── chat-interface.tsx  # Main chat UI
│   │   ├── voice-chat.tsx      # Voice recording + playback
│   │   ├── navbar.tsx          # Top navigation bar
│   │   ├── sidebar.tsx         # Left sidebar navigation
│   │   ├── auth-guard.tsx      # Route protection
│   │   ├── settings-modal.tsx  # Theme/level/speed settings
│   │   ├── curriculum-calendar.tsx  # Calendar view
│   │   └── ui/                 # shadcn/ui primitives
│   ├── lib/                    # API clients and utilities
│   │   ├── auth-service.ts     # Auth API client
│   │   ├── chat-service.ts     # RAG, content, analytics, voice APIs
│   │   └── utils.ts            # Tailwind class merging utility
│   ├── context/                # React context providers
│   │   ├── auth-context.tsx    # Auth state management
│   │   └── visual-theme-context.tsx  # Visual theme state
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts            # Shared types
│   ├── public/                 # Static assets
│   ├── package.json            # Node.js dependencies
│   ├── package-lock.json       # Exact dependency lockfile
│   ├── next.config.ts          # Next.js configuration
│   ├── tsconfig.json           # TypeScript configuration
│   ├── postcss.config.mjs      # PostCSS (Tailwind v4)
│   ├── eslint.config.mjs       # ESLint configuration
│   ├── components.json         # shadcn/ui configuration
│   └── Dockerfile              # Frontend container build
│
├── .github/workflows/
│   └── ci-cd.yml               # CI/CD: test, build, deploy
├── docker-compose.yml          # Local multi-container setup
└── README.md                   # Project documentation
```

---

## 3. Software, Tools & Frameworks Used

### Frontend

| Category | Software/Tool |
|----------|---------------|
| Framework | Next.js (App Router) |
| UI Library | React |
| Language | TypeScript |
| CSS Framework | Tailwind CSS |
| Component Library | Radix UI (headless), shadcn/ui (styled) |
| Icons | Lucide React |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Theming | next-themes |
| Toasts | Sonner |
| Package Manager | npm |

### Backend

| Category | Software/Tool |
|----------|---------------|
| Framework | FastAPI |
| Language | Python |
| ORM | SQLAlchemy |
| Database | MySQL (via PyMySQL driver) |
| RAG Pipeline | LangChain |
| Vector Store | FAISS (faiss-cpu) |
| LLM Provider | Azure OpenAI (GPT-4o-mini) |
| Embeddings | Azure OpenAI (text-embedding-3-small) |
| TTS/STT | Azure OpenAI (Whisper, TTS) |
| Auth | python-jose (JWT), custom OTP |
| Email | Azure Communication Services |
| Blob Storage | Azure Blob Storage |
| Document Parsing | pypdf, docx2txt, python-pptx, unstructured |
| Testing | pytest + httpx |
| App Server | Uvicorn |

### DevOps & Deployment

| Category | Software/Tool |
|----------|---------------|
| Containerization | Docker |
| Container Orchestration | Docker Compose (local) |
| CI/CD | GitHub Actions |
| Container Registry | Azure Container Registry (ACR) |
| Hosting | Azure App Service (Linux containers) |
| Version Control | Git + GitHub |

### Development Tools

| Category | Software/Tool |
|----------|---------------|
| IDE | Cursor / VS Code |
| API Testing | FastAPI Swagger UI (auto-generated at /docs) |
| Python Version Manager | pyenv or system Python |
| Node Version Manager | nvm or system Node.js |

---

## 4. Software Versions & URLs

### Runtime Versions

| Software | Version | Download URL |
|----------|---------|-------------|
| Python | 3.11 | https://www.python.org/downloads/ |
| Node.js | 20 (LTS) | https://nodejs.org/ |
| npm | (bundled with Node.js) | https://nodejs.org/ |
| Docker | Latest | https://www.docker.com/get-started/ |
| Docker Compose | V2 (bundled with Docker Desktop) | https://docs.docker.com/compose/install/ |
| Git | Latest | https://git-scm.com/downloads |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |

### Frontend Dependencies (package.json)

| Package | Version | URL |
|---------|---------|-----|
| next | 16.0.3 | https://nextjs.org/ |
| react | 19.2.0 | https://react.dev/ |
| react-dom | 19.2.0 | https://react.dev/ |
| typescript | ^5 | https://www.typescriptlang.org/ |
| tailwindcss | ^4.1.9 | https://tailwindcss.com/ |
| @radix-ui/react-* | Various (1.x–2.x) | https://www.radix-ui.com/ |
| lucide-react | ^0.454.0 | https://lucide.dev/ |
| recharts | 2.15.4 | https://recharts.org/ |
| react-hook-form | ^7.60.0 | https://react-hook-form.com/ |
| zod | 3.25.76 | https://zod.dev/ |
| next-themes | ^0.4.6 | https://github.com/pacocoursey/next-themes |
| sonner | ^1.7.4 | https://sonner.emilkowal.dev/ |
| class-variance-authority | ^0.7.1 | https://cva.style/ |
| clsx | ^2.1.1 | https://github.com/lukeed/clsx |
| tailwind-merge | ^3.3.1 | https://github.com/dcastil/tailwind-merge |
| date-fns | 4.1.0 | https://date-fns.org/ |
| cmdk | 1.0.4 | https://cmdk.paco.me/ |
| input-otp | 1.4.1 | https://input-otp.rodz.dev/ |
| vaul | ^1.1.2 | https://vaul.emilkowal.dev/ |
| embla-carousel-react | 8.5.1 | https://www.embla-carousel.com/ |
| react-resizable-panels | ^2.1.7 | https://github.com/bvaughn/react-resizable-panels |
| react-day-picker | 9.8.0 | https://react-day-picker.js.org/ |
| @vercel/analytics | 1.3.1 | https://vercel.com/analytics |
| eslint | ^9.13.0 | https://eslint.org/ |
| postcss | ^8.5 | https://postcss.org/ |

### Backend Dependencies (requirements.txt)

| Package | Version Constraint | URL |
|---------|-------------------|-----|
| fastapi | latest | https://fastapi.tiangolo.com/ |
| uvicorn[standard] | latest | https://www.uvicorn.org/ |
| SQLAlchemy | >=2.0 | https://www.sqlalchemy.org/ |
| PyMySQL | latest | https://pymysql.readthedocs.io/ |
| pydantic-settings | >=2.0.3 | https://docs.pydantic.dev/ |
| langchain | latest | https://python.langchain.com/ |
| langchain-openai | latest | https://python.langchain.com/ |
| langchain-community | latest | https://python.langchain.com/ |
| langchain-text-splitters | latest | https://python.langchain.com/ |
| faiss-cpu | latest | https://github.com/facebookresearch/faiss |
| openai | >=1.0 | https://platform.openai.com/docs/ |
| pypdf | latest | https://pypdf.readthedocs.io/ |
| docx2txt | latest | https://pypi.org/project/docx2txt/ |
| unstructured | latest | https://unstructured.io/ |
| python-pptx | latest | https://python-pptx.readthedocs.io/ |
| python-dotenv | latest | https://pypi.org/project/python-dotenv/ |
| email-validator | latest | https://pypi.org/project/email-validator/ |
| python-multipart | latest | https://pypi.org/project/python-multipart/ |
| python-jose[cryptography] | latest | https://pypi.org/project/python-jose/ |
| azure-communication-email | latest | https://learn.microsoft.com/en-us/azure/communication-services/ |
| azure-storage-blob | latest | https://learn.microsoft.com/en-us/azure/storage/blobs/ |
| pytest | latest | https://docs.pytest.org/ |
| httpx | latest | https://www.python-httpx.org/ |

---

## 5. Cloud Services

### Azure Services Used

| Service | Purpose | Azure Portal URL |
|---------|---------|-----------------|
| **Azure OpenAI Service** | LLM (GPT-4o-mini), Embeddings (text-embedding-3-small), TTS, STT (Whisper) | https://portal.azure.com/ → Azure OpenAI |
| **Azure MySQL Flexible Server** | Production database | https://portal.azure.com/ → Azure Database for MySQL |
| **Azure Communication Services** | OTP email delivery | https://portal.azure.com/ → Communication Services |
| **Azure Blob Storage** | Persistent FAISS index storage (optional) | https://portal.azure.com/ → Storage accounts |
| **Azure Container Registry (ACR)** | Docker image registry | https://portal.azure.com/ → Container registries |
| **Azure App Service** | Hosting backend and frontend containers | https://portal.azure.com/ → App Services |

### Azure OpenAI Models Deployed

| Model | Deployment Name | Purpose |
|-------|----------------|---------|
| GPT-4o-mini | `gpt-4o-mini` | Chat completions, content generation, persona responses |
| text-embedding-3-small | `text-embedding-3-small` | Document chunk embeddings for FAISS |
| Whisper | (configured per deployment) | Speech-to-text |
| TTS | (configured per deployment) | Text-to-speech |

### GitHub Actions Secrets Required for CI/CD

| Secret Name | Purpose |
|-------------|---------|
| `ACR_USERNAME` | Azure Container Registry login |
| `ACR_PASSWORD` | Azure Container Registry password |
| `AZURE_BACKEND_PUBLISH_PROFILE` | Backend App Service publish profile |
| `AZURE_FRONTEND_PUBLISH_PROFILE` | Frontend App Service publish profile |

---

## 6. Installation Procedure

### Prerequisites

1. **Python 3.11** — install from https://www.python.org/downloads/
2. **Node.js 20** — install from https://nodejs.org/ (LTS)
3. **MySQL 8.0+** — install locally or use a cloud instance
4. **Git** — install from https://git-scm.com/
5. **Docker** (optional, for containerized run) — install Docker Desktop
6. **Azure OpenAI API access** — create an Azure OpenAI resource with model deployments

### Step-by-step Setup

#### Step 1: Clone the repository

```bash
git clone <repository-url>
cd virtual-teaching-assistant
```

#### Step 2: Backend setup

```bash
cd backend

# Create a virtual environment
python3.11 -m venv myenv
source myenv/bin/activate        # macOS/Linux
# myenv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt
```

#### Step 3: Set up the database

Create a MySQL database:

```sql
CREATE DATABASE vta_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vta_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON vta_db.* TO 'vta_user'@'localhost';
FLUSH PRIVILEGES;
```

Note: Tables are created automatically on startup via SQLAlchemy's `create_all()`.

#### Step 4: Configure backend environment

Create `backend/.env` with the required variables (see [Section 7](#7-environment-parameters) for full list).

#### Step 5: Frontend setup

```bash
cd frontend

# Install dependencies
npm install
```

Optionally create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If not set, the frontend defaults to `http://localhost:8000`.

#### Step 6: Prepare course data

Place course documents (PDF, PPTX, DOCX, TXT, MD) in `backend/data/<course_id>/`.

Example folder structure:

```
backend/data/
└── sc2107/
    ├── Week01_Introduction.pdf
    ├── Week02_DataStructures.pptx
    └── Week03_Algorithms.pdf
```

#### Step 7: Build the FAISS index

Option A — CLI:

```bash
cd backend
python scripts/ingest.py --data data/sc2107 --index index/sc2107
```

Option B — Via API (after starting the backend): Upload files through `/documents/upload/{course_id}` with `auto_ingest=true`.

#### Step 8: Run the application

**Terminal 1 — Backend:**

```bash
cd backend
source myenv/bin/activate
uvicorn main:app --reload
# Runs on http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### Alternative: Docker Setup

```bash
# From project root
docker compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

Make sure `backend/.env` is configured before running Docker Compose.

---

## 7. Environment Parameters

### Backend Environment Variables (`backend/.env`)

#### Required — Azure OpenAI (Chat)

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_OPENAI_API_KEY_CHAT` | API key for the chat model | `abc123...` |
| `AZURE_OPENAI_ENDPOINT_CHAT` | Endpoint URL | `https://your-resource.openai.azure.com/` |
| `AZURE_OPENAI_API_VERSION` | API version | `2024-12-01-preview` |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | Deployment name | `gpt-4o-mini` |

#### Required — Azure OpenAI (Embeddings)

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_OPENAI_API_KEY_Embedding` | API key for embeddings | `abc123...` |
| `AZURE_OPENAI_ENDPOINT_Embedding` | Endpoint URL | `https://your-resource.openai.azure.com/` |
| `AZURE_OPENAI_API_VERSION_Embedding` | API version | `2024-12-01-preview` |
| `AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT` | Deployment name | `text-embedding-3-small` |

#### Required — Application

| Variable | Description | Example |
|----------|-------------|---------|
| `VTA_DATABASE_URL` | SQLAlchemy connection string | `mysql+pymysql://user:pass@host:3306/db` |
| `VTA_SECRET_KEY` | JWT signing secret | `your-random-secret-key` |
| `VTA_EMAIL_CONNECTION_STR` | Azure Communication Services connection string | `endpoint=...;accesskey=...` |
| `VTA_FROM_EMAIL` | Sender email address | `DoNotReply@your-domain.com` |

#### Optional — Azure OpenAI (TTS / STT)

| Variable | Description |
|----------|-------------|
| `AZURE_OPENAI_ENDPOINT_TTS` | TTS endpoint (falls back to chat endpoint) |
| `AZURE_OPENAI_API_KEY_TTS` | TTS API key (falls back to chat key) |
| `AZURE_OPENAI_TTS_DEPLOYMENT` | TTS deployment name |
| `AZURE_OPENAI_API_VERSION_TTS` | TTS API version |
| `AZURE_OPENAI_ENDPOINT_STT` | STT endpoint (falls back to chat endpoint) |
| `AZURE_OPENAI_API_KEY_STT` | STT API key (falls back to chat key) |
| `AZURE_OPENAI_STT_DEPLOYMENT` | STT deployment name |
| `AZURE_OPENAI_API_VERSION_STT` | STT API version |

#### Optional — Application

| Variable | Description | Default |
|----------|-------------|---------|
| `VTA_INDEX_DIR` | Path to FAISS index directory | `./index` |
| `VTA_DATA_DIR` | Path to course data directory | `./data` |
| `VTA_BLOB_CONNECTION_STR` | Azure Blob Storage connection string | (disabled) |
| `VTA_BLOB_CONTAINER` | Blob container name | `gvc-indexes` |
| `VTA_ALLOWED_ORIGINS` | CORS allowed origins | `["*"]` |
| `VTA_TIMEZONE` | Timezone for timestamps | `Asia/Singapore` |
| `VTA_OTP_EXPIRE_MINUTES` | OTP validity period | `10` |
| `VTA_SESSION_DURATION_MINUTES` | Session length | `60` |
| `VTA_SESSION_EXTENSION_MINUTES` | Session extension period | `30` |
| `VTA_SESSION_MAX_EXTENSIONS` | Max session extensions | `3` |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

---

## 8. Key Folders and Files

### Backend

| Folder/File | Purpose |
|-------------|---------|
| `main.py` | **Entry point.** Creates the FastAPI app, registers all 9 routers, sets up CORS, runs startup checks (DB init, directory creation). |
| `settings.py` | **Configuration.** Pydantic settings class with `VTA_` prefix. Reads from `.env`. Defines paths, session params, blob config. |
| `db.py` | **Database.** SQLAlchemy engine creation, session factory, `init_db()` to auto-create tables. Handles Azure MySQL SSL. |
| `models.py` | **ORM Models.** Defines 8 tables: `UserInfo`, `RegisterRequest`, `Session`, `SessionBlacklist`, `QueryLog`, `EventLog`, `Curriculum`, `CurriculumTopic`. |
| `schemas.py` | **API Schemas.** Pydantic models for all request/response payloads. |
| `rag_core/config.py` | **RAG Config.** `AzureSettings` dataclass that reads Azure OpenAI env vars with validation. |
| `rag_core/ingestion.py` | **Document Ingestion.** Loads PDFs/PPTX/DOCX/MD/TXT, splits into chunks, builds FAISS index. Extracts `week` and `topic` metadata from filenames. |
| `rag_core/retrieval.py` | **Retriever.** Loads FAISS index and creates MMR retriever with configurable `k` and `lambda_mult=0.7`. |
| `rag_core/chain.py` | **RAG Chain.** Builds LangChain LCEL pipeline: retriever → context formatting → system prompt (persona + level) → Azure Chat → string output. Contains all 4 persona prompt templates. |
| `routers/rag.py` | **Core Q&A Router.** `/rag/ask` main endpoint. Manages in-memory RAG component cache per course. |
| `routers/auth.py` | **Auth Router.** OTP request/verify, session management, registration approval (professor only). |
| `routers/documents.py` | **Document Router.** Upload, list, delete files. Optional auto-ingestion on upload. |
| `routers/content.py` | **Content Router.** Generates flashcards, quizzes, summaries from course content via RAG. |
| `routers/interactive.py` | **Interactive Router.** Socratic tutoring, teach-back, scenario learning, concept maps, illustrated flashcards, revision from mistakes. |
| `routers/analytics.py` | **Analytics Router.** Logs events/queries, computes engagement metrics, identifies at-risk students. |
| `routers/curriculum.py` | **Curriculum Router.** CRUD for study plans, AI-generated planning via `services/planner.py`. |
| `scripts/ingest.py` | **CLI Ingestion.** Command-line tool to build FAISS indexes offline with configurable chunk size/overlap. |
| `scripts/diagnose.py` | **Diagnostics.** Validates Azure OpenAI env vars and tests connectivity. |
| `scripts/evaluate.py` | **Evaluation.** Automated RAG evaluation harness, outputs JSON/CSV results. |

### Frontend

| Folder/File | Purpose |
|-------------|---------|
| `app/layout.tsx` | **Root Layout.** Wraps entire app with `ThemeProvider`, `VisualThemeProvider`, `AuthProvider`, fonts, Vercel Analytics. |
| `app/(dashboard)/layout.tsx` | **Dashboard Layout.** Auth-guarded shell with `Navbar`, responsive `Sidebar`, `SettingsModal`. |
| `app/login/page.tsx` | **Login Page.** Email OTP login + new user registration. Role-based redirect after auth. |
| `app/(dashboard)/chat/page.tsx` | **RAG Chat.** Course selector + `ChatInterface` with persona support. Supports `?prompt` and `?course` URL params. |
| `app/(dashboard)/professor/page.tsx` | **Professor Console.** Upload documents, build indexes, manage registrations, toggle personas. |
| `app/(dashboard)/learn/page.tsx` | **Learn & Play.** Flashcards, quizzes, summaries in a gamified UI. |
| `app/(dashboard)/analytics/page.tsx` | **Analytics Dashboard.** Recharts-powered visualizations: engagement, topics, students, alerts. |
| `app/(dashboard)/curriculum/page.tsx` | **Curriculum Planner.** AI study plan generation, calendar view, topic status tracking. |
| `components/chat-interface.tsx` | **Chat Component.** Message display, persona selector, voice chat integration, calls `askQuestion`. |
| `components/voice-chat.tsx` | **Voice Component.** Audio recording → STT, TTS playback with voice selection. |
| `components/auth-guard.tsx` | **Route Guard.** Redirects unauthenticated users; supports role-based gating. |
| `lib/chat-service.ts` | **API Client.** All backend API calls: RAG, content, analytics, voice, interactive modes, curriculum, document management. This is the largest frontend file. |
| `lib/auth-service.ts` | **Auth Client.** OTP request/verify, session management, registration APIs. |
| `context/auth-context.tsx` | **Auth State.** Provides `token`, `user`, `status`, `login`, `logout`, `refreshSession` via React context. Persists to `localStorage`. |
| `context/visual-theme-context.tsx` | **Theme State.** Manages visual theme (professional/playful/classic). Persists to `localStorage`. |

---

## 9. Major Functions & Key Points

### RAG Pipeline (Core Feature)

**How it works:**

1. **Ingestion** (`rag_core/ingestion.py`):
   - `load_all_documents(root)` — walks a folder, loads PDF/PPTX/DOCX/MD/TXT files. Extracts `week` and `topic` metadata from filenames (e.g., `Week01_Introduction.pdf`).
   - `split_docs(docs, chunk_size=800, chunk_overlap=200)` — uses `RecursiveCharacterTextSplitter` to create chunks.
   - `build_faiss_index(chunks, index_dir, settings)` — generates Azure OpenAI embeddings and builds a FAISS vector store, saved to disk.

2. **Retrieval** (`rag_core/retrieval.py`):
   - `load_retriever(index_dir, settings, k=6, fetch_k=20)` — loads saved FAISS index and creates an MMR retriever (`lambda_mult=0.7` for diversity).

3. **Chain** (`rag_core/chain.py`):
   - `build_rag_chain(retriever, settings)` — constructs a LangChain LCEL pipeline: retriever → `_format_docs` (context with citations) → persona system prompt → Azure Chat model → string answer.
   - `answer_question(question, rag_chain, retriever, settings, persona, level, history)` — full RAG answer with persona, learning level, optional conversation history. Returns `Answer` with text, sources, and chunk details.

4. **Personas** (`rag_core/chain.py`):
   - `PERSONA_PROMPTS` dictionary defines 4 modes: `standard`, `devils_advocate`, `joker`, `socratic`.
   - `LEVEL_INSTRUCTIONS` adapts language for: `kindergarten`, `primary`, `secondary`, `tertiary` levels.

**Key point:** The RAG system caches loaded indexes in memory per course. Use `DELETE /rag/courses/{course_id}/cache` or `POST /rag/reload/{course_id}` to clear/reload after re-indexing.

### Authentication Flow

1. User enters email → `POST /auth/otp/request` → Azure Communication Services sends OTP email
2. User enters OTP → `POST /auth/otp/verify` → JWT session token returned
3. New users must register → professor approves via `POST /auth/registrations/decide`
4. Sessions use JWT tokens with configurable expiry and extension limits
5. Frontend stores session in `localStorage` (`gvc.auth.session`)

### Content Generation

- `POST /content/flashcards` — AI-generated flashcards from course chunks
- `POST /content/quiz` — Multiple-choice quiz with explanations
- `POST /content/summary` — Summarized notes from course material
- All use the same RAG retriever to find relevant course content first

### Interactive Learning Modes

- `POST /interactive/socratic` — Guided questioning to help students discover answers
- `POST /interactive/teach-back` — Student explains a topic, AI gives structured feedback
- `POST /interactive/concept-map` — Generates concept map nodes and relationships
- `POST /interactive/scenario` — Branching scenario-based learning
- `POST /interactive/illustrated-flashcards` — Flashcards with visual descriptions
- `POST /interactive/revision-from-mistakes` — Targeted revision based on past errors

### Database Tables

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `user_info` | email, role, division, active, otp_hash, otp_expiry | User accounts |
| `register` | email, role, status (pending/approved/rejected) | Registration queue |
| `session` | token_hash, email, expiry, extensions, active | Active sessions |
| `session_blacklist` | token_hash | Revoked tokens |
| `query_log` | email, course, question, persona, confidence | RAG query analytics |
| `event_log` | email, event_type, topic, score, duration | User activity tracking |
| `curriculum` | email, course, title, status, progress | Study plans |
| `curriculum_topic` | name, type, subtopics, status, quiz_config | Plan items |

### Key Points / Gotchas

1. **FAISS index must exist before Q&A works.** Build it via CLI (`scripts/ingest.py`) or upload via API with `auto_ingest=true`.

2. **Azure OpenAI is required.** The system uses Azure-hosted OpenAI models, not the public OpenAI API. You need an Azure subscription with Azure OpenAI Service access.

3. **Database tables auto-create on startup.** No manual migration is needed — SQLAlchemy's `Base.metadata.create_all()` runs in `init_db()`.

4. **Environment variable naming:** Backend uses `VTA_` prefix for app settings (Pydantic settings) and unprefixed names for Azure OpenAI vars.

5. **The `KMP_DUPLICATE_LIB_OK` env var** is set in `main.py` to avoid OpenMP library conflicts on macOS with numpy/FAISS.

6. **Blob storage is optional.** If `VTA_BLOB_CONNECTION_STR` is not set, indexes are only stored locally. In production (Azure App Service), blob storage is used for persistent index storage since container storage is ephemeral.

7. **Frontend visual themes** (professional/playful/classic) are purely CSS-based and stored in `localStorage`. They are separate from the light/dark theme toggle.

8. **The `chat-service.ts`** file in the frontend is the single source of truth for all API calls. Any new backend endpoint needs a corresponding function here.

9. **Auto-ingestion on upload:** When uploading via `POST /documents/upload/{course_id}`, `auto_ingest=true` (default) triggers background index building. Check status with `GET /indexing/status/{course_id}`.

10. **For local development with MySQL:** If using Azure MySQL, SSL is auto-configured in `db.py` when the host contains `mysql.database.azure.com`.

---

## 10. Running the Application

### Local Development

**Backend:**

```bash
cd backend
source myenv/bin/activate
uvicorn main:app --reload
```

- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

**Frontend:**

```bash
cd frontend
npm run dev
```

- UI: http://localhost:3000

### Docker (Local)

```bash
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

### Useful CLI Scripts

```bash
# Build FAISS index from documents
python scripts/ingest.py --data data/<course_id> --index index/<course_id>

# Test RAG Q&A from terminal
python scripts/ask.py --index index/<course_id>
python scripts/ask.py --index index/<course_id> --q "What is data abstraction?"

# Diagnose Azure OpenAI configuration
python scripts/diagnose.py

# Run evaluation suite
python scripts/evaluate.py

# Run backend tests
pytest --tb=short -q
```

### Frontend Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

---

## 11. Deployment (Production)

### CI/CD Pipeline (GitHub Actions)

The `.github/workflows/ci-cd.yml` pipeline runs on push to `main`:

1. **Test Backend** — installs Python 3.11, runs `pytest` with SQLite in-memory DB
2. **Test Frontend** — installs Node 20, runs TypeScript type-check and ESLint
3. **Build & Deploy** (only on main push after tests pass):
   - Builds Docker images for backend and frontend
   - Pushes to Azure Container Registry (`vtacontainerreg.azurecr.io`)
   - Deploys to Azure App Service via Kudu API

### Production URLs

| Service | URL |
|---------|-----|
| Backend API | `https://vta-backend-app.azurewebsites.net` |
| Frontend UI | `https://vta-frontend-app.azurewebsites.net` |
| API Docs | `https://vta-backend-app.azurewebsites.net/docs` |

### Azure App Service Configuration

Backend app settings must be configured in Azure Portal (App Service → Configuration → Application Settings) with all the environment variables listed in [Section 7](#7-environment-parameters).

---

## 12. Troubleshooting & Key Notes

| Issue | Solution |
|-------|----------|
| FAISS index not found | Run `python scripts/ingest.py` or upload documents via API with `auto_ingest=true` |
| Azure OpenAI errors | Run `python scripts/diagnose.py` to validate env vars and test connectivity |
| Database connection fails | Verify `VTA_DATABASE_URL` format: `mysql+pymysql://user:pass@host:3306/db` |
| OTP emails not sending | Check `VTA_EMAIL_CONNECTION_STR` and `VTA_FROM_EMAIL` are valid Azure Communication Services credentials |
| CORS errors in browser | Set `VTA_ALLOWED_ORIGINS` to include your frontend URL |
| OpenMP library conflict (macOS) | This is auto-handled by `KMP_DUPLICATE_LIB_OK=TRUE` in `main.py` |
| Docker build fails | Ensure Docker Desktop is running and you have sufficient disk space |
| Frontend can't reach backend | Verify `NEXT_PUBLIC_API_URL` is set correctly (default: `http://localhost:8000`) |
| Tests fail locally | Set required env vars: `VTA_DATABASE_URL=sqlite:///:memory:`, `VTA_SECRET_KEY=test`, `VTA_EMAIL_CONNECTION_STR=test`, `VTA_FROM_EMAIL=test@test.com` |

---

## Appendix: API Endpoints Summary

| Prefix | Method | Path | Description |
|--------|--------|------|-------------|
| `/` | GET | `/` | API info |
| `/` | GET | `/health` | Health check |
| `/auth` | POST | `/otp/request` | Request OTP email |
| `/auth` | POST | `/otp/verify` | Verify OTP |
| `/auth` | GET | `/session` | Get current session |
| `/auth` | POST | `/logout` | Logout |
| `/auth` | GET | `/registrations` | List pending registrations (professor) |
| `/auth` | POST | `/registrations/decide` | Approve/reject registration (professor) |
| `/rag` | POST | `/ask` | RAG Q&A |
| `/rag` | POST | `/eval` | RAG evaluation |
| `/rag` | GET | `/courses` | List courses |
| `/rag` | GET | `/courses/{id}` | Course info |
| `/rag` | DELETE | `/courses/{id}/cache` | Clear RAG cache |
| `/rag` | POST | `/reload/{id}` | Reload index |
| `/documents` | POST | `/upload/{id}` | Upload files |
| `/documents` | GET | `/list/{id}` | List files |
| `/documents` | DELETE | `/{id}/{filename}` | Delete file |
| `/indexing` | POST | `/build` | Build FAISS index |
| `/indexing` | GET | `/status/{id}` | Index build status |
| `/content` | POST | `/summary` | Generate summary |
| `/content` | POST | `/flashcards` | Generate flashcards |
| `/content` | POST | `/quiz` | Generate quiz |
| `/interactive` | POST | `/socratic` | Socratic tutoring |
| `/interactive` | POST | `/teach-back` | Teach-back feedback |
| `/interactive` | POST | `/concept-map` | Generate concept map |
| `/interactive` | POST | `/scenario` | Scenario learning |
| `/interactive` | POST | `/illustrated-flashcards` | Illustrated flashcards |
| `/interactive` | POST | `/revision-from-mistakes` | Revision from mistakes |
| `/media` | POST | `/tts` | Text-to-speech |
| `/media` | POST | `/stt` | Speech-to-text |
| `/media` | GET | `/voices` | List TTS voices |
| `/analytics` | POST | `/event` | Log event |
| `/analytics` | POST | `/log` | Log query |
| `/analytics` | GET | `/overview` | Analytics overview |
| `/analytics` | GET | `/students` | Student analytics |
| `/analytics` | GET | `/topics` | Topic analytics |
| `/analytics` | GET | `/engagement` | Engagement metrics |
| `/analytics` | GET | `/alerts` | At-risk alerts |
| `/curriculum` | GET | `/` | List curricula |
| `/curriculum` | POST | `/` | Create curriculum |
| `/curriculum` | POST | `/plan` | AI study plan |
| `/curriculum` | GET | `/topics/{id}` | Course topics |
| `/curriculum` | PATCH | `/{id}/topics/{tid}` | Update topic |
| `/curriculum` | DELETE | `/{id}` | Delete curriculum |
