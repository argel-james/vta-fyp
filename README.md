# Virtual Teaching Assistant (VTA)

A full-stack Final Year Project that delivers a **Retrieval-Augmented Generation (RAG)** teaching assistant for university modules. The system ingests course materials (PDF/PPTX/DOCX/MD/TXT), builds a FAISS vector index, and answers student questions with **grounded citations**. It includes **persona-based** learning modes (Standard, Devil’s Advocate, Joker, Socratic) that encourage thought-provoking discussion and guided discovery.

---

## ✅ What I built (project summary)

**Core goal:** help students learn from their own course materials with an AI assistant that is grounded, explainable, and persona-driven.

**Key outcomes:**
- **RAG pipeline** using LangChain + Azure OpenAI + FAISS for grounded QA with citations.
- **Secure login** via OTP email, session management, and role-based access.
- **Student experience** with chat, persona discussions, and guided hints.
- **Professor dashboard** for managing course materials and persona settings (UI-ready).
- **Scalable structure** to add multiple courses with separate indexes.

---

## 🧭 Features

### Student-facing
- **Chat** (`/chat`) — ask questions and get cited answers based on course materials.
- **Persona discussions** (`/personas`) — four learning personas that ask thought‑provoking hints and follow‑ups.
- **Learning controls** — response speed + learning level.

### Professor-facing
- **Professor dashboard** (`/professor`) — upload, indexing status, persona toggle (UI scaffold).

### Backend capabilities
- **RAG QA API**: `/rag/ask`, `/rag/courses`, `/rag/courses/{course_id}`
- **Document upload**: `/documents/upload/{course_id}`
- **Index status**: `/indexing/status/{course_id}`
- **Auth + OTP**: `/auth/otp/request`, `/auth/otp/verify`, `/auth/session`, `/auth/logout`

---

## 🧱 Architecture

**Frontend:** Next.js App Router, TypeScript, Tailwind, Radix UI, shadcn-style components

**Backend:** FastAPI + SQLAlchemy + MySQL + Azure Communication Services Email + LangChain + Azure OpenAI

**RAG flow:**
1. Upload docs → stored under `backend/data/<course_id>/`
2. Ingest script chunks docs → vector index in `backend/index/<course_id>/`
3. `/rag/ask` retrieves top chunks with MMR, injects them into a prompt, and returns a grounded answer with sources.

---

## 📂 Repository layout

```
virtual-teaching-assistant/
├─ backend/
│  ├─ rag_core/         # ingestion, retrieval, chain
│  ├─ routers/          # auth, rag, documents, indexing
│  ├─ scripts/          # ingest, ask, diagnose
│  ├─ models.py         # SQLAlchemy models
│  ├─ settings.py       # env + paths
│  └─ main.py           # FastAPI app
├─ frontend/
│  ├─ app/              # Next.js routes (chat, personas, login, professor)
│  ├─ components/       # UI + chat components
│  ├─ context/          # auth context
│  └─ lib/              # auth + chat API clients
└─ index/               # FAISS indexes by course
```

---

## ⚙️ Setup & Run

### 1) Backend

**Install dependencies**

```
cd backend
pip install -r requirements.txt
```

**Environment variables (create `backend/.env`)**

```
# Azure OpenAI (chat + embeddings)
AZURE_OPENAI_API_KEY_GPT4o-mini=your_key
AZURE_OPENAI_ENDPOINT_GPT4o-mini=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_API_KEY_Embedding=your_key
AZURE_OPENAI_ENDPOINT_Embedding=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION_Embedding=2024-12-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT=text-embedding-3-small
AZURE_OPENAI_EMBEDDING_DIM=1536

# Backend settings (prefix = VTA_)
VTA_DATABASE_URL=mysql+pymysql://user:pass@host:3306/db
VTA_SECRET_KEY=your_secret
VTA_EMAIL_CONNECTION_STR=your_azure_email_connection_string
VTA_FROM_EMAIL=DoNotReply@your-domain
VTA_INDEX_DIR=./index
VTA_ALLOWED_ORIGINS=http://localhost:3000
```

**Run backend**

```
fastapi run main.py
# or: uvicorn main:app --reload
```

---

### 2) Frontend

```
cd frontend
npm install
npm run dev
```

Add this environment variable (optional):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📚 Ingestion & Indexing

Upload docs to `backend/data/<course_id>/`, then build an index:

```
python scripts/ingest.py --data data/sc2107 --index index/sc2107
```

Test the RAG QA chain locally:

```
python scripts/ask.py --index index/sc2107 --q "What is UART?"
```

Validate Azure endpoints:

```
python scripts/diagnose.py
```

---

## 🔐 Authentication & Security

- OTP login via Azure Communication Services email
- JWT session tokens stored in a SQL database
- Session validation + token blacklist on logout
- Role-based access (student vs professor)

---

## 👥 Persona Learning Modes

The assistant supports four persona modes to **encourage critical thinking**:
- **Standard** – clear, structured tutoring
- **Devil’s Advocate** – challenges assumptions
- **Joker** – humorous, memorable explanations
- **Socratic** – guides via probing questions

The `/personas` page uses RAG answers and generates **contextual hints** + **follow‑up prompts** based on the question, response, and cited sources.

---

## ✅ Report-ready summary (paste into ChatGPT)

**Project title:** Virtual Teaching Assistant (RAG + Persona Learning)

**Problem:** Students struggle to engage deeply with lecture materials and often receive generic AI answers not grounded in course content.

**Solution:** I built a full-stack RAG-based teaching assistant that ingests module files, indexes them with FAISS, and provides citation‑grounded answers through a FastAPI backend and a Next.js frontend. A persona system (Standard, Devil’s Advocate, Joker, Socratic) drives thought‑provoking dialogue rather than direct spoon‑feeding.

**Methodology:**
- Data ingestion pipeline for PDF/PPTX/DOCX/MD/TXT
- Chunking + embeddings + FAISS index
- Retriever + prompt templating + Azure OpenAI for grounded responses
- Auth system with OTP email verification + JWT session management
- Frontend UX for chat + persona discussions + source display

**Key contributions:**
- Working RAG pipeline with source citations
- Persona-driven discussion UI with contextual hints and follow‑ups
- Full-stack integration between RAG API and frontend
- Role-based access (student/professor)

**Evaluation plan ideas:**
- Accuracy vs non‑RAG baseline
- Citation relevance and coverage
- User study on engagement/learning quality across personas

**Limitations:**
- Professor dashboard is currently UI‑only (backend wiring pending)
- Indexing triggered via CLI instead of full UI workflow
- Needs broader evaluation on multiple modules

**Future work:**
- Auto-ingest on file upload
- Analytics dashboard for student progress
- Adaptive persona selection based on learning behavior

---

## 🧪 Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind, Radix UI

**Backend:** FastAPI, SQLAlchemy, MySQL, LangChain, FAISS, Azure OpenAI, Azure Email

---

## 📌 Notes

- FAISS indexes live under `backend/index/<course_id>/`.
- Course materials live under `backend/data/<course_id>/`.
- Ensure `VTA_INDEX_DIR` points to the index root (not a specific course folder).

---

## 📄 License

This project is for academic use as part of a Final Year Project.
