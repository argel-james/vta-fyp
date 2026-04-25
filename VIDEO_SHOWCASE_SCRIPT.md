# GVC (GenAI Assisted Virtual Classroom) — Video Showcase Script

> **Format:** The video is stitched from separate recorded segments. Record each section independently and edit them together. Aim for **8–12 minutes** total.
>
> **Tips:**
> - Use a screen recorder with mic audio (e.g., OBS, QuickTime, Loom)
> - Record at 1080p or higher
> - Speak clearly and at a moderate pace
> - Have demo data ready before recording (courses uploaded, a student and professor account active)
> - Use dark mode or light mode consistently throughout — pick one

---

## Pre-Recording Checklist

- [ ] Backend is running (`fastapi run main.py`)
- [ ] Frontend is running (`npm run dev` or deployed)
- [ ] At least one course with documents uploaded and indexed (so RAG works)
- [ ] A **professor** account is active and logged in (or ready to log in)
- [ ] A **student** account is active and logged in (or ready to log in)
- [ ] Prepare 2–3 sample questions related to your course materials
- [ ] Clear any old chat history / reset state if needed for a clean demo

---

## Segment 1: Introduction & Landing Page (~30s)

**What to show:** The login page / landing screen.

**Script:**

> "This is GVC — the GenAI Assisted Virtual Classroom. It's a full-stack application built as my Final Year Project at NTU. GVC uses Retrieval-Augmented Generation to transform uploaded course materials into an intelligent, interactive learning platform. It supports two roles — professors who manage content, and students who learn through AI-powered tools. Let me walk you through the key features."

**Actions:**
1. Show the login page briefly
2. Optionally show the OTP login flow (request OTP → enter code → logged in)

---

## Segment 2: Professor — Document Upload & Indexing (~1–2 min)

**What to show:** The professor dashboard — uploading documents and building the vector index.

**Script:**

> "Let's start from the professor's perspective. After logging in as a professor, I land on the professor dashboard. From here, I can upload course materials — PDFs, lecture notes, slides — which form the knowledge base for the AI assistant."
>
> "Once documents are uploaded, I trigger the indexing process. This chunks the documents, generates embeddings using Azure OpenAI, and builds a FAISS vector index. This index is what powers the RAG pipeline — every student query retrieves relevant chunks from these materials before generating an answer."

**Actions:**
1. Log in as professor → land on `/professor`
2. Show the document upload interface
3. Upload a document (or show already-uploaded documents)
4. Trigger indexing and show the indexing status
5. Briefly mention that indexes can be backed up to Azure Blob Storage

---

## Segment 3: Professor — Registration Approval (~30s)

**What to show:** The professor approving a student's registration request.

**Script:**

> "Professors also manage access control. When a student registers, their request goes to the professor for approval. This ensures only authorized students can access the course materials."

**Actions:**
1. Show the registration approval section on the professor dashboard
2. Approve or show an already-approved request

---

## Segment 4: Student — Home & Navigation (~30s)

**What to show:** The student dashboard and sidebar navigation.

**Script:**

> "Now switching to the student experience. After logging in, students see their home page with quick access to all the learning tools. The sidebar provides navigation to Chat, Personas, Learn and Play, Curriculum, and all the interactive learning modes."

**Actions:**
1. Log in as student → land on `/student`
2. Pan through the sidebar to show all available features
3. Briefly show the settings modal (learning level, response speed, visual themes)

---

## Segment 5: Core Feature — RAG Chat with Sources (~1–2 min)

**What to show:** The standard chat interface — asking questions and getting cited answers.

**Script:**

> "The core of GVC is RAG-based question answering. Students can ask any question related to the course materials. The system retrieves the most relevant chunks from the indexed documents, then uses Azure OpenAI to generate a grounded answer with source citations."
>
> "Notice how each answer includes references to the specific documents and sections it drew from. This ensures transparency — students can verify the information and go deeper into the source material."

**Actions:**
1. Navigate to `/chat`
2. Ask a question related to the uploaded course content
3. Wait for the response — highlight the source citations
4. Ask a follow-up question to show conversational context
5. Optionally show the voice input/output (TTS/STT) if set up

---

## Segment 6: Persona-Based Tutoring (~1–2 min)

**What to show:** The personas page with different tutoring styles.

**Script:**

> "One of the unique features is persona-based tutoring. Students can choose from four distinct AI teaching personas, each with a different pedagogical approach."
>
> "The **Standard** persona gives direct, helpful answers. The **Socratic** persona responds with guiding questions to encourage critical thinking. The **Devil's Advocate** challenges assumptions to deepen understanding. And the **Joker** uses humor and analogies to make learning engaging."
>
> "Let me demonstrate by asking the same question to two different personas — notice how the tone, depth, and approach differ significantly."

**Actions:**
1. Navigate to `/personas`
2. Show all four persona options
3. Select one persona (e.g., Socratic) and ask a question
4. Switch to another persona (e.g., Devil's Advocate) and ask the same question
5. Compare the two responses briefly

---

## Segment 7: Learn & Play — Flashcards, Quiz, Summaries (~1–2 min)

**What to show:** The gamified learning tools.

**Script:**

> "The Learn and Play section transforms course content into active learning tools. Students can generate AI-powered flashcards from the course materials for quick revision. There's also an MCQ quiz mode that tests understanding with auto-generated questions grounded in the actual content. And the summary feature condenses topics into concise study notes."

**Actions:**
1. Navigate to `/learn`
2. Generate flashcards — flip through a few
3. Start a quiz — answer 2–3 questions, show the scoring
4. Generate a summary for a topic

---

## Segment 8: Interactive Learning Modes (~2–3 min)

> This is a rich section — record each mode as a separate mini-clip.

### 8a: Socratic Tutor

**Script:**

> "The Socratic Tutor engages students in a guided dialogue. Instead of giving answers directly, it asks probing questions that lead the student to discover the answer themselves."

**Actions:** Navigate to `/socratic`, start a session, show the back-and-forth.

---

### 8b: Teach-It-Back

**Script:**

> "Teach-It-Back flips the learning model. Students explain a concept in their own words, and the AI evaluates their understanding, identifies gaps, and provides feedback. Research shows that teaching is one of the most effective ways to learn."

**Actions:** Navigate to `/teach-back`, attempt to explain a concept, show the AI's assessment.

---

### 8c: Concept Map

**Script:**

> "The Concept Map feature generates visual knowledge maps from course content, showing how different topics and ideas are interconnected."

**Actions:** Navigate to `/concept-map`, generate a concept map, explore the connections.

---

### 8d: Branching Scenarios

**Script:**

> "Branching Scenarios present students with real-world situations where they make decisions. Each choice leads to different outcomes, creating an engaging, game-like learning experience that develops practical judgment."

**Actions:** Navigate to `/scenarios`, play through a scenario, show branching choices.

---

### 8e: Illustrated Flashcards (Picture Cards)

**Script:**

> "Picture Cards are AI-generated illustrated flashcards that combine visual learning with textual content, making abstract concepts more memorable."

**Actions:** Navigate to `/illustrated`, generate and browse through picture cards.

---

### 8f: Mistake Journal & Revision

**Script:**

> "The Revision feature tracks mistakes from quizzes and interactions, then generates targeted review material. This spaced-repetition approach helps students focus on their weak areas."

**Actions:** Navigate to `/revision`, show the mistake-based review flow.

---

## Segment 9: AI Curriculum Planner (~1 min)

**What to show:** The curriculum planning and tracking feature.

**Script:**

> "The Curriculum Planner uses AI to generate personalized study plans. It extracts topics from the indexed course materials and creates a structured plan with study sessions and quizzes. Students can track their progress, and the plan adapts to their schedule."

**Actions:**
1. Navigate to `/curriculum`
2. Generate a new study plan (or show an existing one)
3. Show the topic breakdown with subtopics
4. Mark a topic as complete to demonstrate progress tracking

---

## Segment 10: Professor — Analytics Dashboard (~1 min)

**What to show:** The analytics views available to professors.

**Script:**

> "Back on the professor side, the Analytics Dashboard provides insight into how students are engaging with the platform. Professors can see an overview of activity, drill into individual student progress, view topic-level engagement, monitor daily and weekly active usage, and receive alerts for at-risk students who may be falling behind."

**Actions:**
1. Log in as professor → navigate to `/analytics`
2. Show the Overview tab
3. Click through Students, Topics, Engagement tabs
4. Show the Alerts section

---

## Segment 11: Technical Architecture (Optional, ~30s–1 min)

**What to show:** A brief architecture diagram or explanation (you can use a slide or draw it).

**Script:**

> "Under the hood, GVC is built with Next.js and React on the frontend, FastAPI on the backend, and MySQL for persistence. The RAG pipeline uses LangChain with FAISS for vector search and Azure OpenAI for embeddings and chat completions. Documents are chunked, embedded, and indexed — then at query time, relevant chunks are retrieved and used to ground the AI's responses. The platform also integrates Azure Communication Services for OTP authentication and supports text-to-speech and speech-to-text for accessibility."

**Actions:**
1. Show a slide or diagram of the architecture (prepare this beforehand)
2. Or briefly show the project structure in your IDE

---

## Segment 12: Closing (~15s)

**Script:**

> "That's GVC — the GenAI Assisted Virtual Classroom. It demonstrates how retrieval-augmented generation can power a comprehensive, interactive, and personalized learning experience. Thank you for watching."

---

## Suggested Editing Order

When stitching the video together, follow this order for the best narrative flow:

1. **Intro** (Segment 1)
2. **Professor setup** (Segments 2–3) — establishes the content pipeline
3. **Student home** (Segment 4) — transitions to the learner experience
4. **RAG Chat** (Segment 5) — the core value proposition
5. **Personas** (Segment 6) — shows teaching style variety
6. **Learn & Play** (Segment 7) — active learning
7. **Interactive modes** (Segment 8a–8f) — the breadth of features
8. **Curriculum** (Segment 9) — planning and tracking
9. **Analytics** (Segment 10) — closing the professor feedback loop
10. **Architecture** (Segment 11, optional)
11. **Closing** (Segment 12)

---

## Estimated Segment Durations

| Segment | Duration |
|---------|----------|
| 1. Intro | ~30s |
| 2. Upload & Indexing | ~1–2 min |
| 3. Registration Approval | ~30s |
| 4. Student Home | ~30s |
| 5. RAG Chat | ~1–2 min |
| 6. Personas | ~1–2 min |
| 7. Learn & Play | ~1–2 min |
| 8. Interactive Modes (all) | ~2–3 min |
| 9. Curriculum | ~1 min |
| 10. Analytics | ~1 min |
| 11. Architecture | ~30s–1 min |
| 12. Closing | ~15s |
| **Total** | **~8–12 min** |

---

## Bonus Tips for a Polished Video

- **Add title cards** between segments (e.g., "Feature: RAG Chat with Sources") for easy navigation
- **Use zoom-ins** on important UI elements (source citations, quiz scores, persona labels)
- **Add background music** at low volume for a professional feel
- **Include captions/subtitles** — especially useful for technical terms
- **If a feature loads slowly**, speed up the waiting portion in post-production (2x or 4x)
- **Keep a consistent browser window size** across all recordings
- **Close unnecessary browser tabs** and notifications before recording
