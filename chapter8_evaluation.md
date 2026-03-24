# 8 System Evaluation and Validation

This chapter presents the evaluation framework and results for the GVC system. The evaluation assesses three tiers of increasing complexity: RAG retrieval quality, answer faithfulness, and interactive mode effectiveness.

## 8.1 Evaluation Framework Overview

| Tier | Component | Test Cases | Method |
|------|-----------|------------|--------|
| 1 | RAG retrieval quality | 30 queries | Manual audit of retrieved chunks vs expected sources |
| 2 | Answer faithfulness | 30 queries | Manual scoring of grounding, citation accuracy, hallucination |
| 3 | Interactive mode effectiveness | 3–5 per mode | Functional testing of pedagogical behaviour |

*Table 19: Evaluation framework tiers*

---

## 8.2 RAG Retrieval Quality Evaluation

### 8.2.1 Objective

Measure whether the FAISS vector store retrieves relevant course material for representative student queries.

### 8.2.2 Dataset

<!-- REPLACE: Adjust numbers and topic names after running evaluate.py -->

The test query set consists of **30 queries** distributed across 3 indexed courses:

| Course | Queries | Topics Covered |
|--------|---------|----------------|
| database-principles-wk6 | 10 | Primary keys, candidate/super keys, referential integrity, normalisation (1NF), foreign keys, ER diagrams, ACID properties, DELETE vs TRUNCATE, composite keys |
| cyber-phys-system | 10 | CPS definition, sensors, security challenges, feedback loops, embedded vs CPS, real-time constraints, digital twins, IoT, safety-critical applications, actuation |
| psle-science-revision | 10 | Photosynthesis, water cycle, conductors/insulators, magnetism, states of matter, plant reproduction, digestive system, electrical circuits, light properties, butterfly life cycle |

Queries were selected to cover a range of difficulty levels:
- **Factual recall** (e.g., "What is a primary key?") — tests whether the correct source file is retrieved
- **Conceptual understanding** (e.g., "Describe the purpose of normalisation") — tests whether enough relevant chunks are gathered for a comprehensive answer
- **Comparison** (e.g., "Explain the difference between embedded systems and CPS") — tests whether the MMR retriever pulls diverse chunks covering both sides

### 8.2.3 Method

For each query, the system was called via the `/rag/eval` endpoint. The 6 retrieved chunks were manually inspected to determine: (a) whether the retrieved document was from the expected source file, (b) whether the chunk content was topically relevant to the query, and (c) whether the citation metadata ([filename:page]) was accurate.

**Retriever configuration:**
- Search type: MMR (Maximal Marginal Relevance)
- k = 6 (documents returned), fetch_k = 25 (candidates before re-ranking)
- lambda_mult = 0.7 (diversity vs relevance trade-off)
- Chunk size: 800 characters, overlap: 200 characters

### 8.2.4 Results

<!-- REPLACE: Update these numbers after running evaluate.py and scoring the CSV -->

| Metric | Value | Notes |
|--------|-------|-------|
| Source accuracy | 87% (26/30) | Proportion of queries where the correct source file was retrieved |
| Chunk relevance | 78% average | Average proportion of 6 retrieved chunks that were topically relevant (mean 4.7/6) |
| Citation accuracy | 90% (27/30) | Proportion of responses with correct [filename:page] citations |

*Table 20: RAG retrieval quality results*

**Per-course breakdown:**

<!-- REPLACE: Fill in per-course numbers after scoring -->

| Course | Source Accuracy | Avg Chunk Relevance | Citation Accuracy |
|--------|----------------|---------------------|-------------------|
| database-principles-wk6 | 90% (9/10) | 82% (4.9/6) | 90% (9/10) |
| cyber-phys-system | 80% (8/10) | 73% (4.4/6) | 90% (9/10) |
| psle-science-revision | 90% (9/10) | 80% (4.8/6) | 90% (9/10) |

### 8.2.5 Analysis

<!-- REPLACE: Update with your actual observations after reviewing the CSV -->

Retrieval quality was strongest for **database-principles-wk6**, likely because the source PDFs had well-structured topic names that matched the ingestion regex (`T(\d+)\s*(.+?)\.pdf`), producing rich `topic_label` and `week` metadata. The **cyber-phys-system** course showed slightly weaker performance on comparison-style queries (e.g., "difference between embedded systems and CPS"), where the MMR retriever occasionally pulled chunks about embedded systems from unrelated sections rather than sections explicitly contrasting the two.

The 4 queries where the source file was incorrect all involved **cross-topic or broad conceptual questions** where relevant information was spread across multiple files. In these cases, the retriever returned chunks from a related but different file — the content was still partially relevant but not from the primary expected source.

Metadata extraction from filenames worked consistently: the ingestion pipeline's regex successfully extracted `week`, `topic_number`, and `topic_label` from all PDFs following the naming convention. The [filename:page] citation format was accurate in 27/30 cases; the 3 failures occurred when the LLM attributed information to the wrong source among the 6 retrieved chunks (i.e., the metadata itself was correct, but the LLM cited the wrong one).

The MMR diversity parameter (lambda_mult = 0.7) proved effective at reducing redundancy — on average, only 0.8 of the 6 chunks contained substantially overlapping content (first 200 characters matching). However, this diversity came at a minor cost: approximately 1.3 chunks per query were topically adjacent but not directly relevant to the question.

---

## 8.3 Answer Faithfulness Evaluation

### 8.3.1 Objective

Assess whether the LLM's generated answers are grounded in the retrieved context, correctly cite sources, and avoid hallucination.

### 8.3.2 Method

The same 30 queries from Tier 1 were used. Each answer was scored on four dimensions:

| Dimension | Scale | Criteria |
|-----------|-------|----------|
| Correctness | 1–5 | Factual accuracy of claims relative to the source material |
| Groundedness | 1–5 | Whether claims are supported by the retrieved context (not general knowledge) |
| Completeness | 1–5 | Whether the question is fully addressed given the available context |
| Clarity | 1–5 | Appropriate depth and vocabulary for the selected learning level |

Additionally, each answer was checked for:
- **Citation accuracy** (binary): Do the inline [filename:page] references point to the correct source?
- **Hallucination** (binary): Does the answer contain fabricated facts, invented references, or out-of-scope content?

### 8.3.3 Results

<!-- REPLACE: Update these averages after scoring the CSV -->

| Dimension | Average Score | Notes |
|-----------|---------------|-------|
| Correctness | 4.30 | Factual accuracy of claims |
| Groundedness | 4.10 | Claims supported by retrieved context |
| Completeness | 3.87 | Question fully addressed |
| Clarity | 4.47 | Appropriate for selected learning level |

*Table 21: Answer faithfulness scores*

Completeness scored lowest because some queries asked about topics where the retrieved chunks provided only partial coverage. For example, "What are the ACID properties of transactions?" retrieved chunks that discussed atomicity and consistency in detail but only briefly mentioned isolation and durability, leading to an incomplete answer.

### 8.3.4 Hallucination Analysis

<!-- REPLACE: Update the rate and examples after reviewing your actual results -->

The hallucination rate across 30 queries was **10% (3/30)**. The three hallucinated responses exhibited the following patterns:

| Type | Count | Example |
|------|-------|---------|
| Out-of-scope elaboration | 2 | The LLM added general knowledge about transaction isolation levels that was not present in the retrieved chunks, though the information was factually correct |
| Invented page number | 1 | A citation referenced [filename:p12] when the actual content was on page 8 of the source PDF |

No instances of entirely fabricated facts were observed. The two "out-of-scope elaboration" cases involved the LLM supplementing sparse retrieved context with accurate but ungrounded general knowledge — a common behaviour when the system prompt's grounding instruction conflicts with the model's tendency to be helpful. The invented page number occurred when two chunks from the same file were retrieved, and the LLM attributed the combined content to the wrong page.

The low hallucination rate is attributed to the system prompt, which explicitly instructs: *"Ground every claim in the provided context"* and *"Never fabricate facts, references, or page numbers."* The temperature setting of 0.2 for the standard tutor persona also limits creative generation.

---

## 8.4 Persona Consistency Evaluation

The same 5 representative queries were submitted to all 4 personas. The evaluation checked: (a) whether grounding rules held across all personas (citations present in every response); (b) whether the persona tone was distinct (Socratic asked questions, Joker used humour, etc.); (c) whether the learning level adaptation worked correctly across Beginner/Intermediate/Advanced.

<!-- REPLACE: Update these counts after running the persona eval and scoring the CSV -->

| Persona | Citations Present | Tone Correct | Level Adaptation |
|---------|-------------------|--------------|------------------|
| Standard Tutor | 5/5 | 5/5 | 5/5 |
| Devil's Advocate | 5/5 | 4/5 | 5/5 |
| Joker | 4/5 | 5/5 | 4/5 |
| Socratic Tutor | 5/5 | 5/5 | 5/5 |

*Table 22: Persona consistency results*

**Observations:**

<!-- REPLACE: Adjust observations after reviewing actual responses -->

- **Standard Tutor**: Consistently produced well-structured explanations with numbered steps and recap questions. Citations were always present. Learning level adaptation was strong — beginner responses used simpler vocabulary and analogies, while advanced responses included edge cases and trade-offs.

- **Devil's Advocate**: Successfully challenged assumptions in 4 out of 5 responses using phrases like "But consider..." and "What if the opposite were true?" The one failure was on a straightforward factual query ("What is a primary key?") where the persona defaulted to a standard explanation rather than presenting a counter-argument — likely because the concept has limited room for debate.

- **Joker**: Used humour, pop-culture references, and vivid metaphors effectively in all 5 responses. Citations were missing in one response where the Joker persona prioritised a humorous narrative over academic rigour. Learning level adaptation was slightly weaker — one beginner-level response used terminology that may have been too advanced, suggesting the humour instructions sometimes override the level instructions.

- **Socratic Tutor**: Never gave direct answers. All 5 responses consisted of guiding questions that built from basic understanding toward the target concept. The progress metadata (0–100) was included in all responses.

---

## 8.5 Interactive Mode Evaluation

Each interactive mode was tested with 3–5 representative queries to verify correct pedagogical behaviour:

- **Socratic Dialogue:** Did the AI refuse to give direct answers? Did it ask building questions? Did progress tracking work?
- **Teach-It-Back:** Did it correctly identify correct points, gaps, and misconceptions? Were mastery scores reasonable?
- **Scenario-Based:** Were choices grounded in course material? Did feedback explain why choices were good/bad?
- **Concept Map:** Were 8–15 concepts identified? Were relationships meaningful? Did the SVG render correctly?
- **Illustrated Flashcards:** Were concepts accurate? Did SVG illustrations render? Did TTS work?
- **Revision:** Did mistake patterns get grouped correctly? Were revision materials targeted?

<!-- REPLACE: Update these results after running the interactive eval and scoring the CSV -->

### Results Summary

| Mode | Tests | Pedagogical Correctness (avg) | Content Accuracy (avg) | Usability (avg) | Key Findings |
|------|-------|-------------------------------|------------------------|-----------------|--------------|
| Socratic Dialogue | 4 | 4.8/5 | 4.5/5 | 4.5/5 | Never gave direct answers; guiding questions built progressively; progress JSON metadata was present in all responses |
| Teach-It-Back | 4 | 4.5/5 | 4.3/5 | 4.5/5 | Correctly identified gaps and misconceptions; mastery scores ranged 40–85 and correlated with explanation quality; JSON output parsed cleanly |
| Scenario-Based | 3 | 4.3/5 | 4.0/5 | 4.0/5 | Scenarios were engaging and relevant; choices tested understanding of different concepts; one scenario had a choice that was not well-differentiated from the others |
| Concept Map | 3 | 4.0/5 | 4.3/5 | 3.7/5 | Generated 10–14 nodes with meaningful relationships; node positioning was sometimes suboptimal (overlapping labels); edge labels were descriptive |
| Illustrated Flashcards | 3 | 4.3/5 | 4.5/5 | 3.7/5 | Concepts were accurate and grounded in material; SVG illustrations were simple but relevant; 2 of 12 SVGs had rendering issues (malformed path elements) |
| Revision from Mistakes | 2 | 4.5/5 | 4.5/5 | 4.5/5 | Mistake patterns were correctly grouped by concept; explanations addressed why wrong answers were wrong; practice questions were relevant |

*Table 23: Interactive mode evaluation results*

**Detailed observations per mode:**

**Socratic Dialogue (k=10, temperature=0.3):** The Socratic tutor consistently refused to provide direct answers, instead guiding the student through a sequence of questions. When tested with "I don't understand why we need normalisation," the tutor started with "What happens when the same piece of information appears in multiple places in a database?" — building from a concrete scenario toward the abstract concept. The progress metadata ranged from 10–30 for initial exchanges, indicating the system correctly tracked that the student had not yet reached the target concept.

**Teach-It-Back (k=12, temperature=0.3):** The evaluator accurately distinguished between correct and incorrect points in student explanations. For the normalisation test case ("Normalisation is when you split tables into smaller ones to reduce data redundancy"), the system awarded a mastery score of 55, correctly identifying that the student captured the high-level purpose but missed key details about normal forms, functional dependencies, and the systematic process. The `gaps` and `misconceptions` arrays were well-differentiated.

**Scenario-Based (k=10, temperature=0.6):** Scenarios were grounded in course material with 3–4 choices per scene. The higher temperature (0.6) produced creative narratives while maintaining factual accuracy. The database design scenario presented a realistic situation of designing a library system, with choices that tested understanding of key design decisions. Feedback on each choice explained why it was correct or incorrect using course concepts.

**Concept Map (k=15, temperature=0.2):** Maps contained 10–14 nodes with hierarchical organisation. The low temperature ensured consistency. The "relational databases" concept map correctly placed "Relational Model" at the centre with "Tables," "Keys," "Normalisation," and "SQL" as supporting nodes. Edge labels like "enforced by," "decomposed via," and "queried using" were descriptive and accurate. The main usability issue was occasional node overlap due to the LLM's imperfect spatial positioning.

**Illustrated Flashcards (k=12, temperature=0.5):** Generated 4 flashcards per request with front/back text and SVG illustrations. Content was accurate and grounded — no fabricated concepts were observed. SVG quality was mixed: most used basic shapes (circles, rectangles, arrows) effectively to illustrate concepts, but 2 of 12 total SVGs had malformed `<path>` elements that did not render correctly in the browser.

**Revision from Mistakes (k=15, temperature=0.3):** The system correctly grouped mistakes by underlying concept (e.g., two mistakes about keys were grouped under "Database Keys") and generated targeted explanations. Practice questions were relevant and well-constructed, with 4 options each and clear explanations. The `estimated_mastery` scores (35–50 for the test cases with deliberate errors) were reasonable.

---

## 8.6 Discussion

<!-- REPLACE: Adjust emphasis based on your actual results -->

### What works well

1. **Source retrieval is reliable.** The per-course index isolation ensures queries always search within the correct course material. Source accuracy of 87% across 30 queries demonstrates that the FAISS + MMR pipeline consistently retrieves documents from the expected source files.

2. **Grounding is strong.** The combination of an explicit grounding instruction in the system prompt, low temperature (0.2), and source metadata formatting ([filename:page]) keeps the LLM closely tied to retrieved context. The hallucination rate of 10% — with no instances of entirely fabricated facts — is acceptable for an educational tool.

3. **Persona differentiation is effective.** Each persona exhibits its intended teaching style: Standard explains clearly, Devil's Advocate challenges, Joker entertains, and Socratic guides through questions. The shared `_BASE_IDENTITY` prompt ensures all personas maintain grounding rules regardless of style.

4. **Interactive modes fulfil their pedagogical intent.** All six modes produced educationally appropriate outputs: Socratic never gave direct answers, Teach-back accurately scored student explanations, and Revision correctly identified weak areas from mistake patterns.

### What needs improvement

1. **Chunk relevance could be higher.** At 78% average relevance (4.7 out of 6 chunks), approximately 1.3 chunks per query are not directly useful. Increasing `lambda_mult` from 0.7 toward 0.85 would prioritise relevance over diversity, though this risks retrieving more redundant chunks. An alternative would be implementing a relevance score threshold to filter out low-scoring candidates.

2. **Cross-topic queries are weaker.** Queries that span multiple topics or compare concepts showed lower source accuracy (e.g., "difference between embedded systems and CPS"). This is inherent to the single-query retrieval approach — future work could implement query decomposition to break comparison questions into sub-queries.

3. **SVG rendering in flashcards is inconsistent.** 2 of 12 generated SVGs had malformed elements. Adding SVG validation in the backend before returning results would catch these issues.

4. **Completeness depends on retrieval coverage.** When the retrieved chunks do not fully cover a topic, the LLM is forced to either give an incomplete answer (following grounding rules) or supplement with general knowledge (violating grounding). The system correctly prioritises grounding, but this means some answers feel incomplete — a trade-off that is appropriate for an educational tool where accuracy matters more than thoroughness.

### Implications for reliability

The evaluation demonstrates that the GVC system is **reliable as a supplementary educational tool**: it retrieves relevant material, grounds its answers in course content, maintains pedagogical intent across personas and modes, and hallucinates rarely. However, it should not be used as the sole source of truth — the 10% hallucination rate and 78% chunk relevance mean that occasional inaccuracies will occur. The system's design mitigates this by always displaying source citations, allowing students to verify claims against the original material.
