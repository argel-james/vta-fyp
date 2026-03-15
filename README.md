# GenAI Assisted Virtual Classroom

A full-stack Final Year Project delivering a **GenAI-powered virtual classroom** with RAG-based Q&A, gamified learning, persona-driven discussions, and instructor analytics. Supports learners of all ages — from kindergarten to university.

---

## Features

### Student-facing
- **Chat** (`/chat`) — ask questions and get cited answers from course materials.
- **Persona discussions** (`/personas`) — four learning personas (Standard, Devil's Advocate, Joker, Socratic) with guided hints and follow-ups.
- **Learn & Play** (`/learn`) — Duolingo-style gamified learning:
  - AI-generated flashcards from course content
  - Multiple-choice quizzes with explanations
  - Summarized notes
  - Streak tracking and playful animations
- **Visual themes** — toggle between Professional, Playful (for young learners), and Classic themes.
- **Learning controls** — response speed and learning level settings.

### Professor-facing
- **Professor dashboard** (`/professor`) — upload materials, view ingestion status, toggle personas.
- **Analytics** (`/analytics`) — query trends, topic heatmaps, student engagement metrics (privacy-safe).

### Backend capabilities
- **RAG Q&A**: `/rag/ask`, `/rag/courses`, `/rag/courses/{course_id}`
- **Document upload + auto-ingestion**: `/documents/upload/{course_id}`
- **Content generation**: `/content/flashcards`, `/content/quiz`, `/content/summary`
- **Analytics**: `/analytics/log`, `/analytics/course/{id}`, `/analytics/overview`
- **Index management**: `/indexing/build`, `/indexing/status/{course_id}`
- **Auth + OTP**: `/auth/otp/request`, `/auth/otp/verify`, `/auth/session`, `/auth/logout`
- **Azure Blob Storage** (optional) for persistent FAISS index storage

---

## Architecture

**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI

**Backend:** FastAPI, SQLAlchemy 2, MySQL, LangChain, FAISS, Azure OpenAI (GPT-4o-mini + text-embedding-3-small)

**RAG flow:**
1. Upload documents → stored under `backend/data/<course_id>/` with category metadata
2. Auto-ingestion chunks documents → FAISS vector index in `backend/index/<course_id>/`
3. `/rag/ask` retrieves top chunks with MMR, injects into prompt, returns grounded answer with sources
4. `/content/*` endpoints use the same retriever to generate flashcards, quizzes, summaries

---

## Repository layout

```
virtual-teaching-assistant/
├─ backend/
│  ├─ rag_core/         # ingestion, retrieval, chain
│  ├─ routers/          # auth, rag, documents, indexing, content, analytics
│  ├─ utils/            # otp, security, email, blob_storage
│  ├─ scripts/          # ingest, ask, diagnose
│  ├─ models.py         # SQLAlchemy models (auth + QueryLog)
│  ├─ settings.py       # env + paths + blob storage config
│  └─ main.py           # FastAPI app
├─ frontend/
│  ├─ app/              # Next.js routes (chat, personas, learn, login, professor)
│  ├─ components/       # UI + chat components
│  ├─ context/          # auth context, visual theme context
│  └─ lib/              # auth + chat + content API clients
└─ docker-compose.yml
```

---

## Setup & Run

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```
AZURE_OPENAI_API_KEY_CHAT=your_key
AZURE_OPENAI_ENDPOINT_CHAT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_API_KEY_Embedding=your_key
AZURE_OPENAI_ENDPOINT_Embedding=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION_Embedding=2024-12-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT=text-embedding-3-small

VTA_DATABASE_URL=mysql+pymysql://user:pass@host:3306/db
VTA_SECRET_KEY=your_secret
VTA_EMAIL_CONNECTION_STR=your_azure_email_connection_string
VTA_FROM_EMAIL=DoNotReply@your-domain
VTA_INDEX_DIR=./index

# Optional: Azure Blob Storage for persistent index storage
# VTA_BLOB_CONNECTION_STR=your_blob_connection_string
# VTA_BLOB_CONTAINER=gvc-indexes
```

Run backend:

```bash
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional env:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Ingestion

Upload docs via the API or place them in `backend/data/<course_id>/`, then build an index:

```bash
python scripts/ingest.py --data data/sc2107 --index index/sc2107
```

Or use the upload endpoint with `auto_ingest=true` (default) to auto-build the index after upload.

---

## Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI

**Backend:** FastAPI, SQLAlchemy, MySQL, LangChain, FAISS, Azure OpenAI, Azure Communication Services Email, Azure Blob Storage (optional)

---

## License

This project is for academic use as part of a Final Year Project.
