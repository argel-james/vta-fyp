# GenAI Assisted Virtual Classroom — Technical Report

## 1. Project Overview

The **GenAI Assisted Virtual Classroom (GVC)** is a full-stack, production-grade web application that leverages Generative AI and Retrieval-Augmented Generation (RAG) to deliver a personalised, interactive learning experience. The platform serves both **students** and **professors**, offering AI-powered question answering grounded in real course materials, gamified learning modes, multiple AI tutor personas, voice interaction, and a comprehensive analytics dashboard for educators.

The system is designed to support learners across all education levels — from kindergarten to university — through adaptive learning levels, configurable visual themes, and persona-driven pedagogical approaches.

---

## 2. System Architecture

### 2.1 High-Level Architecture

The application follows a **decoupled client-server architecture** with a clear separation between the frontend presentation layer and the backend API/AI layer.

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)             │
│  React 19 · TypeScript · Tailwind CSS 4 · Radix UI  │
│         App Router · SSR · Client Components         │
└─────────────────────┬───────────────────────────────┘
                      │ REST API (JSON)
                      │ Bearer JWT Authentication
┌─────────────────────▼───────────────────────────────┐
│                   Backend (FastAPI)                   │
│  LangChain · FAISS · Azure OpenAI · SQLAlchemy 2     │
│       RAG Pipeline · Content Gen · Analytics         │
└──────┬──────────┬──────────┬──────────┬─────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼───┐ ┌───▼──────────┐
  │  MySQL │ │  FAISS │ │ Azure │ │ Azure Blob   │
  │   DB   │ │ Vector │ │OpenAI │ │ Storage      │
  │        │ │  Store │ │ (LLM) │ │ (optional)   │
  └────────┘ └────────┘ └───────┘ └──────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | Next.js (App Router) | 16.0.3 |
| **UI Library** | React | 19.2.0 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **Component Primitives** | Radix UI (shadcn/ui pattern) | Various 1.x–2.x |
| **Backend Framework** | FastAPI | Latest |
| **ORM** | SQLAlchemy | ≥ 2.0 |
| **Database** | MySQL (via PyMySQL) | — |
| **Vector Store** | FAISS (CPU) | Latest |
| **Orchestration** | LangChain | Latest |
| **LLM** | Azure OpenAI GPT-4o-mini | API 2024-12-01-preview |
| **Embeddings** | Azure OpenAI text-embedding-3-small | 1536 dimensions |
| **TTS** | Azure OpenAI gpt-4o-mini-tts | API 2025-03-01-preview |
| **STT** | Azure OpenAI Whisper | API 2024-12-01-preview |
| **Email Service** | Azure Communication Services | — |
| **Blob Storage** | Azure Blob Storage | — |
| **Containerisation** | Docker + Docker Compose | — |
| **CI/CD** | GitHub Actions | — |
| **Cloud Hosting** | Azure App Service + Azure Container Registry | — |

---

## 3. RAG Pipeline — Technical Deep Dive

The Retrieval-Augmented Generation pipeline is the core intellectual contribution of the system. It ensures that all AI-generated responses are **grounded in actual course materials**, preventing hallucination and enabling source citations.

### 3.1 Document Ingestion

**Supported formats:** PDF, PPTX, PPT, DOCX, Markdown, TXT

Each format is handled by a specialised LangChain loader:

| Format | Loader |
|--------|--------|
| `.pdf` | `PyPDFLoader` |
| `.pptx` / `.ppt` | `UnstructuredPowerPointLoader` |
| `.docx` | `Docx2txtLoader` |
| `.md` | `UnstructuredMarkdownLoader` |
| `.txt` | `TextLoader` (UTF-8) |

**Metadata extraction:** The system automatically extracts structural metadata from filenames using regex patterns:
- `week[_\s-]?(\d+)` → `week` number
- `T(\d+)\s*(.+?)(?:\s*-\s*Full)?\.pdf$` → `topic_number` and `topic_label`

This metadata is preserved through the chunking process and used for source attribution in responses.

### 3.2 Chunking Strategy

The system uses LangChain's `RecursiveCharacterTextSplitter` with a carefully tuned configuration:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Chunk size** | 800 tokens | Balances context density with retrieval precision |
| **Chunk overlap** | 200 tokens | Ensures continuity across chunk boundaries |
| **Separators** | `["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""]` | Hierarchical splitting — preserves paragraph → sentence → clause structure |
| **keep_separator** | `True` | Retains natural language boundaries |

The recursive approach attempts to split at paragraph boundaries first, falling back to progressively finer-grained separators. This preserves semantic coherence within each chunk — a critical factor for retrieval quality.

A separate CLI ingestion script (`scripts/ingest.py`) uses slightly different parameters (chunk_size=1200, overlap=150) for bulk offline processing of large document collections.

### 3.3 Embedding and Indexing

- **Embedding model:** Azure OpenAI `text-embedding-3-small` producing **1536-dimensional** dense vectors
- **Vector store:** FAISS (Facebook AI Similarity Search) running on CPU
- **Persistence:** Indexes are saved locally under `index/<course_id>/` and optionally synced to Azure Blob Storage for cross-environment persistence
- **Index isolation:** Each course maintains its own independent FAISS index, enabling multi-course support without cross-contamination

### 3.4 Retrieval Strategy

The system uses **Maximal Marginal Relevance (MMR)** retrieval rather than simple similarity search:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `k` | 6 (default) | Number of chunks returned |
| `fetch_k` | 25 | Candidate pool size before MMR reranking |
| `lambda_mult` | 0.7 | Diversity-relevance trade-off (0.7 favours relevance with moderate diversity) |

MMR ensures that retrieved chunks are both **relevant to the query** and **diverse in content**, avoiding redundant retrieval of near-duplicate passages. Different interactive modes use custom `k` values (up to 15) depending on context requirements.

### 3.5 Answer Generation

The RAG chain assembles a structured prompt:

1. **System prompt**: Base identity + persona instructions + learning level guidance
2. **Conversation history**: Last 6 messages for multi-turn coherence
3. **Human prompt**: Retrieved context (formatted as `[filename:pN]\n{content}`) + user question
4. **LLM**: Azure OpenAI GPT-4o-mini at temperature 0.2 for factual consistency
5. **Post-processing**: Source deduplication (top 5 unique sources returned with file and page references)

The base system prompt enforces strict grounding rules:
- Every claim must be grounded in provided context
- Sources must be cited using `[filename:page]` notation
- The model must explicitly acknowledge when context is insufficient
- Fabrication of facts, references, or page numbers is prohibited

---

## 4. AI Personas — Pedagogical Approach

The system implements four distinct AI tutor personas, each embodying a different pedagogical strategy:

### 4.1 Standard Tutor
- Clear, structured explanations with numbered steps
- Examples and analogies to build intuition
- Ends with a brief recap or comprehension check question

### 4.2 Devil's Advocate
- Challenges the student's assumptions with counter-arguments
- Asks provocative "what if" questions to deepen critical thinking
- Forces students to defend and refine their understanding

### 4.3 Joker
- Uses humour, pop-culture references, and vivid metaphors
- Creates mnemonics and memorable analogies
- Makes learning feel informal and approachable while maintaining accuracy

### 4.4 Socratic Tutor
- Employs the Socratic method — never gives direct answers
- Guides discovery through carefully scaffolded questions
- Provides hints when students are stuck, but only reveals answers when explicitly asked
- Builds from prior knowledge to new understanding

### 4.5 Learning Level Adaptation

Each persona further adapts its responses based on three learning levels:

| Level | Behaviour |
|-------|-----------|
| **Beginner** | Simple vocabulary, short sentences, everyday analogies |
| **Intermediate** | Technical terminology with brief clarifications, links to prior knowledge |
| **Advanced** | Full technical depth, edge cases, trade-offs, cross-domain connections |

---

## 5. Interactive Learning Modes

Beyond standard Q&A, the system offers six distinct interactive learning modes, each with its own retrieval configuration, prompt engineering, and temperature setting.

### 5.1 Socratic Dialogue (`/socratic`)

An extended Socratic tutoring session where the AI guides discovery through questions. Features:
- Topic-scoped retrieval (k=10) with concept-focused fallback queries
- Real-time progress tracking (0–100%) with metadata parsed from each response
- Hint detection to adapt guidance intensity
- Voice input/output integration for conversational learning
- Temperature: 0.3

### 5.2 Teach-It-Back Evaluation (`/teach-back`)

Students explain a concept in their own words, and the AI evaluates their explanation against the course material. Returns:
- **Mastery score** (0–100)
- **Correct points** identified in the student's explanation
- **Gaps** — concepts the student missed
- **Misconceptions** — factual errors with corrections from source material
- **Suggestions** — targeted review recommendations
- **Model explanation** — a reference explanation the student can learn from
- Retrieval: k=12, temperature: 0.3

### 5.3 Scenario-Based Learning (`/scenarios`)

An interactive choose-your-own-adventure learning game:
- 4-scene narrative arcs with 3–4 choices per scene
- Each choice tests understanding of different course concepts
- Contextual feedback explains why choices are good or bad, referencing course material
- Final score and list of concepts covered
- Retrieval: k=10, temperature: 0.6 (higher for creative narrative)

### 5.4 AI-Generated Concept Maps (`/concept-map`)

Produces interactive, draggable concept maps:
- Identifies 8–15 key concepts from course material
- Maps relationships between concepts with descriptive edge labels
- Categorises nodes as **core**, **supporting**, or **detail**
- SVG-based visualisation with drag-and-drop interaction
- Retrieval: k=15, temperature: 0.2 (low for structural accuracy)

### 5.5 Illustrated Flashcards (`/illustrated`)

AI-generated flashcards with inline SVG illustrations:
- Each card includes a concept (front), explanation (back), and a custom SVG illustration
- Colour-coded cards for visual distinction
- Flip animation and thumbnail navigation
- Voice read-aloud via TTS integration
- Retrieval: k=12, temperature: 0.5

### 5.6 Mistake Journal and Revision (`/revision`)

A persistent mistake-tracking system with targeted revision generation:
- Students log mistakes (question, their answer, correct answer, topic) stored in `localStorage`
- AI analyses error patterns and groups mistakes by underlying concept
- Generates targeted revision material per weak area:
  - Concept explanation
  - Analysis of why the student struggled
  - Key points to remember
  - Practice questions with explanations
- Estimated mastery percentage
- Retrieval: k=15, temperature: 0.3

---

## 6. Content Generation Engine

The system includes a dedicated content generation pipeline that leverages the same RAG retriever to produce study materials grounded in course content.

### 6.1 Revision Notes / Summary
- Structured notes with headings, bullet points, key definitions, and formulas
- Source citations using `[filename:page]` notation
- k=15 retrieval for comprehensive coverage, temperature: 0.3

### 6.2 AI-Generated Flashcards
- Configurable count, optional topic focus
- Each card: specific question (front) + concise answer (back)
- Diversity enforced — no repeated question types
- k=12 retrieval, temperature: 0.4

### 6.3 Multiple-Choice Quizzes
- Configurable count with progressive difficulty
- 4 options per question with plausible distractors
- Explanations for correct answers
- Topic diversity enforcement
- k=12 retrieval, temperature: 0.5

All content generation strictly prohibits information fabrication — every fact must trace back to the provided course material.

---

## 7. Voice Interaction

The platform supports full bidirectional voice interaction:

### 7.1 Speech-to-Text (Input)
- **Model:** Azure OpenAI Whisper
- **Recording:** Browser MediaRecorder API, WebM format
- **Flow:** Record → upload audio → Whisper transcription → inject as text input
- **Language:** English

### 7.2 Text-to-Speech (Output)
- **Model:** Azure OpenAI gpt-4o-mini-tts
- **10 voice options:** alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer
- **Custom instructions** support for voice style control
- **Output:** MP3 streaming audio
- **UI:** Read-aloud button on assistant messages, stop button for playback control

---

## 8. Authentication and Authorisation

### 8.1 OTP-Based Passwordless Authentication
- Email-based OTP (6-digit code) sent via Azure Communication Services
- OTP hashed with SHA-256 before storage — plaintext never persisted
- Configurable expiry (default: 5 minutes)
- Resend with 60-second cooldown enforced on frontend

### 8.2 JWT Session Management
- HS256-signed JWT tokens with claims: `sub` (email), `role`, `sid` (session ID), `iat`, `exp`
- Sessions stored in database with token hash
- Configurable session duration (default: 60 minutes) with extension support (30 min, max 2 extensions)
- Token blacklisting on logout for immediate session invalidation

### 8.3 Role-Based Access Control
- **Student role:** Access to all learning features (chat, personas, interactive modes, learn & play)
- **Professor role:** Access to professor dashboard, document upload, analytics, registration approvals
- **Registration workflow:** New users submit registration requests; professors can approve or reject registrations through the dashboard

### 8.4 Frontend Protection
- `AuthGuard` component wraps all protected routes
- Role-based route restrictions
- Automatic redirect to login on session expiry
- Session validation against backend on page load

---

## 9. Analytics Dashboard

The professor-facing analytics dashboard provides comprehensive, privacy-safe insights into student learning patterns.

### 9.1 Overview Metrics
- Total students, active students, at-risk student count
- Average quiz score, hardest topic identification
- Total queries and events

### 9.2 Per-Student Analytics
- Query count, quiz attempts, average score
- Weak topics identification
- Last activity timestamp
- Risk level classification

### 9.3 Topic Analytics
- Per-topic attempt counts, correct/incorrect breakdown
- Failure rate calculation
- Visual **topic heatmap** with colour-coded failure rates
- Query count per topic

### 9.4 Engagement Metrics
- **Daily Active Users (DAU)** and **Weekly Active Users (WAU)** with custom bar chart visualisations
- Average session duration
- **Learning funnel analysis:** lesson_opened → quiz_started → quiz_completed

### 9.5 At-Risk Student Detection
Automatic identification of at-risk students based on three criteria:
- **Inactive >7 days** — student has not used the platform recently
- **Repeated low scores** — 2 or more quiz scores below 50%
- **No quiz engagement** — student has not attempted any quizzes
- Each alert includes suggested actions for the professor

### 9.6 Filtering
- Course-level filtering (all courses or specific course)
- Time period filtering (7, 14, 30, 90, 365 days)

---

## 10. Professor Dashboard

### 10.1 Document Management
- **Drag-and-drop file upload** supporting PDF, DOCX, PPTX, PPT, Markdown, and TXT
- Configurable content categories: university, kindergarten, primary, secondary, other
- Optional **auto-ingestion** — uploaded documents are automatically chunked, embedded, and indexed as a background task
- Document listing and deletion per course

### 10.2 Ingestion Status Monitoring
- Real-time index status per course (indexed/not indexed, document count, category)
- Manual index rebuild trigger

### 10.3 Registration Management
- View pending registration requests
- Approve or reject student/professor registrations

### 10.4 Persona Configuration
- Toggle available personas for the course

---

## 11. Frontend Design and User Experience

### 11.1 Visual Themes
The application supports three visual themes to accommodate different learner demographics:

| Theme | Style | Target |
|-------|-------|--------|
| **Professional** | Clean indigo/blue, modern typography | University students |
| **Playful** | Rounded corners, pink accents, playful typography | Young learners |
| **Classic** | Serif fonts, muted amber tones | Traditional preference |

Themes are applied via `data-visual-theme` CSS attribute and persist in `localStorage`.

### 11.2 Dark Mode
- Full dark mode support via `next-themes` with `class` attribute strategy
- CSS custom properties for all colour tokens in both `:root` and `.dark` scopes
- Persisted preference in `localStorage`

### 11.3 Responsive Design
- Mobile-first responsive layouts using Tailwind breakpoints (`sm`, `md`, `lg`)
- Collapsible sidebar with hamburger navigation on mobile
- Flexible grid layouts that adapt from single-column (mobile) to multi-column (desktop)

### 11.4 Chat Interface UX
- **Streaming word-by-word animation** (10–40ms per word) for natural reading feel
- **Suggested starter prompts** before first message
- Auto-scroll to latest message
- Persona-specific message styling with icons and labels
- Source citation display on assistant messages
- Learning level quick-switch buttons

### 11.5 Animations and Transitions
- Page transitions with 300ms opacity animation via `PageTransitionWrapper`
- Bounce, pulse, and spin loading indicators
- Fade-in and slide-up entry animations
- Smooth colour transitions on theme/mode changes

### 11.6 Component Architecture
- **shadcn/ui pattern**: Radix UI primitives styled with Tailwind CSS using `class-variance-authority` for variant management and `tailwind-merge` for class deduplication
- Component variants: buttons (default, destructive, outline, secondary, ghost, link), cards, inputs, labels
- Toast notifications via Sonner
- Form validation with `react-hook-form` + `zod` schemas
- OTP input with dedicated `input-otp` component

---

## 12. Database Design

### 12.1 Schema

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_info` | User accounts | email, role (student/professor), division, is_active, otp_hash, otp_timestamp |
| `register` | Registration requests | email, division, role, status (pending/approved/rejected) |
| `session` | Active sessions | email, token_hash, expiry, extension_count, last_activity, is_active |
| `session_blacklist` | Revoked tokens | token_hash, revoked_at |
| `query_log` | RAG query audit trail | email, course_id, question, persona, topic_tag, confidence |
| `event_log` | Learning event tracking | email, course_id, event_type, topic, quiz_id, question_index, score, total, duration_seconds, detail |

### 12.2 ORM and Session Management
- SQLAlchemy 2.x with `future=True` mode
- PyMySQL driver with SSL enabled for Azure MySQL
- FastAPI dependency injection via `get_db()` yielding scoped sessions
- Schema auto-creation via `create_all()` on startup

---

## 13. DevOps and Deployment

### 13.1 Containerisation
Both frontend and backend have optimised multi-stage Dockerfiles:

**Backend (`python:3.11-slim`):**
- Build stage installs system dependencies for FAISS and unstructured document parsing
- Production stage runs Uvicorn on port 8000
- Minimal image size through multi-stage build

**Frontend (`node:20-alpine`):**
- Build stage compiles Next.js standalone output
- Production stage runs as non-root user
- Standalone `server.js` on port 3000

**Docker Compose** orchestrates both services with:
- Volume mounts for `data/` and `index/` directories (persistent storage)
- Environment variable injection from `.env`
- Service dependency ordering (frontend depends on backend)

### 13.2 CI/CD Pipeline (GitHub Actions)

The `.github/workflows/ci-cd.yml` pipeline implements a full continuous integration and deployment workflow:

**Triggers:** Push and pull request to `main`

| Job | Steps |
|-----|-------|
| **test-backend** | Python 3.11 setup → install dependencies → pytest with SQLite in-memory DB |
| **test-frontend** | Node 20 setup → install dependencies → TypeScript type-check → ESLint |
| **build-and-deploy** | Build Docker images → push to Azure Container Registry → deploy to Azure App Service |

**Deployment targets:**
- **Azure Container Registry:** `vtacontainerreg.azurecr.io`
- **Backend:** `https://vta-backend-app.azurewebsites.net`
- **Frontend:** `https://vta-frontend-app.azurewebsites.net`
- **Image tagging:** `latest` + git commit SHA for traceability

### 13.3 Security Practices
- Secrets managed via GitHub Actions secrets (ACR credentials, Azure publish profiles)
- Environment variables for all sensitive configuration — no hardcoded secrets
- OTP hashed before storage (SHA-256)
- JWT tokens hashed in session table
- Token blacklisting for immediate logout
- Filename sanitisation on uploads blocking path traversal and invalid characters
- CORS configured with explicit allowed origins
- SSL enabled for database connections

---

## 14. Testing

### 14.1 Backend Tests
- **Framework:** pytest with httpx `TestClient`
- **Test fixtures:** Temporary data/index directories, mocked LLM and retriever
- **Coverage areas:**
  - Health and root endpoint validation
  - Course listing and OpenAPI spec
  - Schema validation (settings, request models)
  - Content generation (summary, flashcards, quiz) with mocked LLM
  - Media configuration and validation (TTS/STT)
  - Interactive modes (Socratic, teach-back, concept map, scenario, illustrated flashcards)

### 14.2 Frontend Checks
- TypeScript type-checking
- ESLint static analysis
- Both run as part of CI pipeline

---

## 15. API Design

The backend exposes a RESTful API organised into eight router modules:

| Router | Prefix | Endpoints | Purpose |
|--------|--------|-----------|---------|
| **RAG** | `/rag` | 5 | Question answering, course management, cache control |
| **Documents** | `/documents` | 3 | File upload, listing, deletion |
| **Indexing** | `/indexing` | 2 | Index build (background task), status |
| **Auth** | `/auth` | 7 | OTP, session management, registration |
| **Content** | `/content` | 3 | Summary, flashcards, quiz generation |
| **Analytics** | `/analytics` | 8 | Events, query logs, dashboards, alerts |
| **Media** | `/media` | 3 | TTS, STT, voice listing |
| **Interactive** | `/interactive` | 6 | Socratic, teach-back, scenario, concept map, revision, illustrated flashcards |

**Total: 37 API endpoints** across 8 modules.

All endpoints use Pydantic models for request/response validation and include proper HTTP status codes and error handling.

---

## 16. Key Design Decisions and Trade-Offs

| Decision | Rationale |
|----------|-----------|
| **FAISS over managed vector DB** | Zero infrastructure cost, fast local retrieval, suitable for course-scale document collections |
| **MMR over similarity search** | Avoids retrieving redundant/overlapping chunks, improves answer diversity |
| **Chunk size 800 with 200 overlap** | Empirically tuned — smaller chunks improve precision while overlap ensures no information is lost at boundaries |
| **GPT-4o-mini over GPT-4o** | Cost-efficient for high-volume educational queries while maintaining strong response quality |
| **text-embedding-3-small** | 1536 dimensions provide strong semantic representation at lower cost than `text-embedding-3-large` |
| **OTP over password auth** | Eliminates password management risks, suitable for educational context |
| **Per-course index isolation** | Prevents cross-contamination between courses, enables independent index management |
| **Temperature variation by mode** | Low (0.2–0.3) for factual/evaluative tasks, medium-high (0.5–0.6) for creative/narrative tasks |
| **localStorage for mistake journal** | Privacy-first — student mistakes never leave the browser |
| **Background tasks for indexing** | Non-blocking document ingestion keeps the API responsive during large uploads |

---

## 17. Summary of Contributions

This project delivers a comprehensive, production-ready GenAI-powered educational platform that combines:

1. **A robust RAG pipeline** with hierarchical chunking, MMR retrieval, and strict grounding rules to ensure factual accuracy
2. **Four pedagogically distinct AI personas** enabling diverse teaching strategies within a single platform
3. **Six interactive learning modes** (Socratic dialogue, teach-it-back evaluation, scenario-based learning, concept mapping, illustrated flashcards, mistake-based revision) — each with purpose-built prompt engineering and retrieval configurations
4. **Full voice interaction** (STT + TTS) enabling conversational learning
5. **AI-powered content generation** (flashcards, quizzes, revision notes) grounded in course materials
6. **A comprehensive analytics dashboard** with at-risk student detection, topic heatmaps, engagement funnels, and per-student tracking
7. **Passwordless OTP authentication** with role-based access control
8. **Multi-theme, responsive UI** supporting learners from kindergarten to university
9. **A production deployment pipeline** with Docker containerisation, GitHub Actions CI/CD, and Azure cloud hosting
10. **37 REST API endpoints** across 8 modular routers with full Pydantic validation

The system demonstrates the practical application of modern AI techniques — retrieval-augmented generation, prompt engineering, multi-persona design, and adaptive learning — in a real-world educational context.
