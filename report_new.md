# GenAI Assisted Virtual Classroom — Supplementary Report (New Features)

This supplement documents all features and improvements implemented **after** the original `report.md` was written. It covers the curriculum planner, Learn & Play hub, analytics dashboard overhaul, backend data-integrity fixes, code quality improvements, and updated system totals.

---

## 1. AI-Powered Curriculum Planner

A full-featured, per-user study planning system that leverages the RAG pipeline to generate personalised study plans from course materials.

### 1.1 Overview

The curriculum planner allows students to:
1. Select a course and discover available topics (extracted from the FAISS index metadata)
2. Request an AI-generated study plan with customisable parameters (weekly hours, class schedule, time range)
3. Review and reorder the plan before saving
4. Track progress topic-by-topic through the plan
5. View progress in three layouts: **list**, **timeline (by week)**, and **calendar schedule**

### 1.2 Topic Discovery

The system extracts course topics from two sources:

1. **FAISS index metadata** — scans chunk metadata for `topic_label`, `week`, `source` fields extracted during ingestion
2. **LLM fallback** — if metadata yields fewer than 3 topics, the system retrieves sample chunks (k=8) and asks the LLM to infer topic names from the content

This hybrid approach ensures topic discovery works regardless of how well-structured the original filenames are.

### 1.3 Plan Generation Algorithm

The planner uses the same RAG retriever as the main Q&A pipeline:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **Retrieval k** | 8 per topic (capped at 10 topics) | Gather context for each selected topic |
| **Deduplication** | First 200 characters of content | Prevent redundant chunks from inflating context |
| **Context window** | ~4000 characters total | Balance detail with prompt length limits |
| **Temperature** | 0.4 | Moderate creativity for plan structure while maintaining factual grounding |

The LLM generates a structured plan with:
- **Study sessions** — topic name, subtopics to cover, estimated hours, target date (e.g. "Week 1, Monday")
- **Quiz checkpoints** — interspersed quiz items with configurable question counts and topic scope
- **Scheduling hints** — if a `class_day` is provided, the plan aligns study sessions around the class schedule

### 1.4 Progress Tracking

Each topic in a saved plan has an independent status:

| Status | Meaning |
|--------|---------|
| `not_started` | Default state |
| `in_progress` | Student has begun working on this topic |
| `completed` | Student has finished this topic |
| `skipped` | Student chose to skip this topic |

Progress is recomputed on every status update: `completed ÷ total × 100`. When progress reaches 100%, the curriculum status is automatically set to `completed`.

### 1.5 Calendar View

The `CurriculumCalendar` component (`frontend/components/curriculum-calendar.tsx`) provides a visual schedule:

- **Date resolution** — parses target dates like "Week 2, Wednesday" relative to the plan's `created_at` timestamp and optional `class_day` configuration
- **Month and week views** — toggle between full calendar and weekly focus
- **Event indicators** — colour-coded dots showing study sessions vs quiz checkpoints
- **Deep links** — clicking a topic opens quick-action links to:
  - Chat about the topic
  - Start a Socratic dialogue
  - Generate a concept map
  - Do a teach-back evaluation

### 1.6 Database Schema

Two new tables support the curriculum feature:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `curriculum` | Study plans | email, course_id, title, status (active/completed/archived), progress_percent, class_day, class_start_time, class_end_time, created_at, updated_at |
| `curriculum_topic` | Individual plan items | curriculum_id (FK), order, name, item_type (study_session/quiz), subtopics (JSON), quiz_config (JSON), target_date, hours, status, created_at, updated_at |

### 1.7 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/curriculum` | List all curricula for the authenticated user |
| `GET` | `/curriculum/topics/{course_id}` | Discover topics from course FAISS index |
| `POST` | `/curriculum/plan` | Generate an AI study plan (returns JSON for review) |
| `POST` | `/curriculum` | Save a reviewed plan to the database |
| `PATCH` | `/curriculum/{id}/topics/{topic_id}` | Update a topic's status and recompute progress |
| `DELETE` | `/curriculum/{id}` | Delete a curriculum and all its topics |

### 1.8 Authentication

The curriculum router uses a lightweight JWT-based auth (`_get_current_email`) that decodes the token directly from the `Authorization` header rather than performing a full session lookup. This is intentional — the curriculum is a personal feature that only needs email identity, not session state.

---

## 2. Learn & Play Hub

A student-facing interactive learning page (`/learn`) that consolidates the content generation features into a gamified experience.

### 2.1 Features

- **AI Flashcards** — generates flashcards from course material with flip animation and navigation
- **MCQ Quiz** — generates and presents multiple-choice quizzes with per-question answer checking
- **Summary** — generates revision notes from course content
- **Streak tracking** — client-side consecutive-correct-answer streak counter with visual feedback (fire emoji)
- **Post-quiz celebrations** — emoji-based feedback (trophy/star/muscle) after quiz completion
- **Playful mode** — when the visual theme is set to `playful`, a random mascot character and kid-friendly copy are shown

### 2.2 Analytics Integration

The Learn & Play hub logs events to the analytics pipeline:
- `answer_result` — per question with correct/incorrect detail and topic
- `quiz_completed` — final score, total questions, and duration

These events feed directly into the professor analytics dashboard (topic failure rates, student scores, engagement metrics).

---

## 3. Student Landing Hub

The `/student` page (`frontend/app/(dashboard)/student/page.tsx`) provides a first-class landing page for students with:

- Quick-access cards linking to Chat, Personas, Learn & Play, and all interactive modes
- Persona deep links via `/personas?mode=` query parameters
- Visual tiles with icons and descriptions for each feature
- Responsive grid layout adapting from single-column to multi-column

---

## 4. Analytics Dashboard Overhaul

The professor analytics dashboard has been significantly upgraded in both correctness and visual presentation.

### 4.1 Bug Fixes

| Issue | Fix |
|-------|-----|
| **"All Courses" selection was impossible** — a `useEffect` auto-forced the first course on every render, overriding the user's selection | Courses are now fetched only once using a ref guard; auto-selection only occurs on initial load when no course is pre-selected |
| **Silent error swallowing** — `Promise.all` with an empty `catch` meant one failed API call silently killed all data | Switched to `Promise.allSettled` — each endpoint is handled independently; failures show an error banner while successful sections still render |
| **`total_students` ignored course filter** — the backend always counted all students system-wide even when filtering by a specific course | When `course_id` is set, `total_students` now equals the count of students active in that course's logs; "All Courses" still counts all registered students |
| **`weak_topics` was misleading** — showed the most frequently asked topics (query count) instead of topics where the student actually struggled | Changed to track `failed_topics` using `answer_result` events with `detail == "incorrect"`, showing topics with the most incorrect answers |
| **`avg_session_duration_s` was inflated** — summed duration from ALL event types but divided by only `quiz_started` + `lesson_opened` counts | Both numerator and denominator now use only session-type events |
| **Alerts period was silently capped at 14 days** — the frontend hardcoded `Math.min(days, 14)` while the UI implied the full selected period | Removed the cap; alerts now use the same period as all other analytics sections |
| **Engagement tab showed blank** when data was null — no empty state, no loading indicator | Added proper empty/loading state fallback |

### 4.2 Recharts Visualisation Upgrade

The dashboard now uses **Recharts** (v2.15.4) with the application's CSS chart variables (`--color-chart-1` through `--color-chart-5`) for theme-consistent colouring.

**New chart types:**

| Chart | Tab | Purpose |
|-------|-----|---------|
| **Area Chart** (gradient fill) | Overview, Engagement | Daily Active Users time series |
| **Horizontal Bar Chart** (coloured cells) | Overview, Engagement | Learning funnel, event breakdown |
| **Donut Chart** | Overview, Students | Risk distribution (low/medium/high) |
| **Radar Chart** (dual-axis) | Overview, Topics | Failure rate vs average score overlaid across topics |
| **Vertical Bar Chart** | Students, Engagement | Score distribution by bucket, Weekly Active Users |
| **Horizontal Bar Chart** (conditional colour) | Topics | Topic failure rates colour-coded by severity (red > 50%, yellow > 25%, green) |

**Additional UI improvements:**

- **KPI cards** — redesigned with icons, contextual subtitles (e.g. "62% of total"), and gradient accent bars
- **Custom tooltips** — glass-morphism style with backdrop blur, shadows, and colour-coded entries
- **Loading spinner** — animated spinner in the Refresh button
- **Score bars** — inline progress bars in the Students table colour-coded green/yellow/red by score
- **Struggled-topic tags** — bordered pills in red for visual emphasis
- **Alert avatars** — initial-based avatar circles for at-risk student cards
- **Hover effects** — scale-up on heatmap tiles, row highlights on tables

### 4.3 Resilient Data Loading

- `Promise.allSettled` ensures partial API failures don't break the entire dashboard
- Error banner shows which sections failed (e.g. "Failed to load: engagement, alerts")
- Empty states with loading indicators for all five tabs
- Each section renders independently — a failed students endpoint doesn't affect the topics tab

---

## 5. Settings Modal

A centralised settings interface accessible from the sidebar (`frontend/components/settings-modal.tsx`):

| Setting | Control | Persistence |
|---------|---------|-------------|
| **Visual Theme** | Three-option selector (Professional, Playful, Classic) | `localStorage` via `VisualThemeProvider` |
| **Learning Level** | Three-option selector (Beginner, Intermediate, Advanced) | React state in dashboard layout |
| **Response Speed** | Slider (10–100%) | React state in dashboard layout |
| **About** | Application information display | — |

---

## 6. Code Quality Improvements

### 6.1 ESLint Configuration

The frontend uses a **flat ESLint config** (`eslint.config.mjs`) with `typescript-eslint`:

```javascript
export default [
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  { ignores: [".next/", "node_modules/", "out/"] },
];
```

The `caughtErrorsIgnorePattern` and `varsIgnorePattern` rules were added to properly handle underscore-prefixed variables in catch clauses and destructuring patterns, resolving CI pipeline failures.

### 6.2 Lint Fixes Applied

| File | Issue | Resolution |
|------|-------|------------|
| `analytics/page.tsx` | Unused `idx` parameter | Renamed to `_idx` |
| `curriculum/page.tsx` | Unused `CardContent` import | Removed |
| `curriculum/page.tsx` | Undefined `react-hooks/exhaustive-deps` rule | Removed stale `eslint-disable` comment |
| `scenarios/page.tsx` | Unused `pastFeedback` variable | Destructured as `[, setPastFeedback]` |
| `layout.tsx` | Unused `_geistMono` variable | Handled by `varsIgnorePattern` |
| `auth-context.tsx`, `auth-service.ts`, `chat-service.ts` | Unused `error` in catch clauses | Renamed to `_error` |

---

## 7. Updated System Totals

### 7.1 API Surface

| Router | Prefix | Endpoints | Status |
|--------|--------|-----------|--------|
| **RAG** | `/rag` | 5 | Original |
| **Documents** | `/documents` | 3 | Original |
| **Indexing** | `/indexing` | 2 | Original |
| **Auth** | `/auth` | 7 | Original |
| **Content** | `/content` | 3 | Original |
| **Analytics** | `/analytics` | 8 | Updated (bug fixes) |
| **Media** | `/media` | 3 | Original |
| **Interactive** | `/interactive` | 6 | Original |
| **Curriculum** | `/curriculum` | 6 | **New** |

**Total: 43 API endpoints** across **9 modular routers** (up from 37 endpoints across 8 routers).

### 7.2 Database Tables

| Table | Status |
|-------|--------|
| `user_info` | Original |
| `register` | Original |
| `session` | Original |
| `session_blacklist` | Original |
| `query_log` | Original |
| `event_log` | Original |
| `curriculum` | **New** |
| `curriculum_topic` | **New** |

**Total: 8 tables** (up from 6).

### 7.3 Frontend Pages

| Route | Status |
|-------|--------|
| `/login` | Original |
| `/student` | New (landing hub) |
| `/chat` | Original |
| `/personas` | Original |
| `/learn` | New (Learn & Play) |
| `/curriculum` | **New** |
| `/socratic` | Original |
| `/teach-back` | Original |
| `/concept-map` | Original |
| `/scenarios` | Original |
| `/illustrated` | Original |
| `/revision` | Original |
| `/analytics` | Updated (Recharts overhaul) |
| `/professor` | Original |

### 7.4 Technology Additions

| Technology | Purpose |
|------------|---------|
| **Recharts 2.15.4** | Chart visualisations (area, bar, radar, pie charts) for the analytics dashboard |

---

## 8. Data Persistence Architecture

The system uses a layered persistence strategy that ensures all data survives container restarts:

| Data | Storage | Persistence Mechanism |
|------|---------|----------------------|
| **Uploaded documents** | `backend/data/<course_id>/` | Docker bind mount (`./backend/data → /app/data`) |
| **FAISS vector indexes** | `backend/index/<course_id>/` | Docker bind mount (`./backend/index → /app/index`) |
| **MySQL data** | External MySQL instance | Via `VTA_DATABASE_URL` (not containerised) |
| **In-memory RAG cache** | Python process memory | Lost on restart; rebuilt on-demand from disk indexes |
| **Index backup** | Azure Blob Storage (optional) | Uploaded via `/indexing/build`; auto-downloaded when local index is missing |

The `docker-compose.yml` defines the critical bind mounts:

```yaml
volumes:
  - ./backend/data:/app/data
  - ./backend/index:/app/index
```

`backend/settings.py` creates these directories on startup via `ensure_directories()`, and the paths can be overridden with `VTA_DATA_DIR` and `VTA_INDEX_DIR` environment variables.
