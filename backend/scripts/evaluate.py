"""
Evaluation script for Chapter 8: System Evaluation and Validation.

Runs four evaluation passes:
  Tier 1 — RAG retrieval quality (source accuracy, chunk relevance)
  Tier 2 — Answer faithfulness (grounding, citation accuracy, hallucination)
  Tier 3 — Interactive mode effectiveness (pedagogical correctness, accuracy, usability)
  Tier 4 — Persona consistency (same queries across all 4 personas x 3 levels)

Usage:
    python scripts/evaluate.py --base-url http://localhost:8000

The script writes timestamped results to  backend/eval_results/  as JSON (raw)
and CSV (for manual scoring in a spreadsheet).  It does NOT auto-score; you
fill in the scoring columns manually after inspecting each result.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

RESULTS_DIR = Path(__file__).resolve().parent.parent / "eval_results"

# ── Test queries per course ────────────────────────────────────────────
# Adjust these to match the actual content of your indexed PDFs.

TEST_QUERIES: dict[str, list[dict[str, str]]] = {
    "database-principles-wk6": [
        {"q": "What is a primary key and why is it important?", "expected_source_hint": ""},
        {"q": "Explain the difference between a candidate key and a super key.", "expected_source_hint": ""},
        {"q": "What is referential integrity?", "expected_source_hint": ""},
        {"q": "Describe the purpose of normalisation in database design.", "expected_source_hint": ""},
        {"q": "What is a foreign key constraint?", "expected_source_hint": ""},
        {"q": "Explain first normal form (1NF) with an example.", "expected_source_hint": ""},
        {"q": "What is an entity-relationship diagram?", "expected_source_hint": ""},
        {"q": "What are the ACID properties of transactions?", "expected_source_hint": ""},
        {"q": "Explain the difference between DELETE and TRUNCATE.", "expected_source_hint": ""},
        {"q": "What is a composite key?", "expected_source_hint": ""},
    ],
    "cyber-phys-system": [
        {"q": "What is a cyber-physical system?", "expected_source_hint": ""},
        {"q": "Explain the role of sensors in CPS.", "expected_source_hint": ""},
        {"q": "What are the key challenges in securing cyber-physical systems?", "expected_source_hint": ""},
        {"q": "Describe the feedback loop in CPS.", "expected_source_hint": ""},
        {"q": "What is the difference between embedded systems and CPS?", "expected_source_hint": ""},
        {"q": "Explain real-time constraints in cyber-physical systems.", "expected_source_hint": ""},
        {"q": "What is a digital twin?", "expected_source_hint": ""},
        {"q": "How does IoT relate to cyber-physical systems?", "expected_source_hint": ""},
        {"q": "What are safety-critical CPS applications?", "expected_source_hint": ""},
        {"q": "Explain the concept of actuation in CPS.", "expected_source_hint": ""},
    ],
    "psle-science-revision": [
        {"q": "What is photosynthesis and what does a plant need for it?", "expected_source_hint": ""},
        {"q": "Explain the water cycle.", "expected_source_hint": ""},
        {"q": "What is the difference between conductors and insulators?", "expected_source_hint": ""},
        {"q": "How does a magnet work?", "expected_source_hint": ""},
        {"q": "What are the three states of matter?", "expected_source_hint": ""},
        {"q": "Explain how plants reproduce.", "expected_source_hint": ""},
        {"q": "What is the human digestive system?", "expected_source_hint": ""},
        {"q": "How does an electrical circuit work?", "expected_source_hint": ""},
        {"q": "What are the properties of light?", "expected_source_hint": ""},
        {"q": "Explain the life cycle of a butterfly.", "expected_source_hint": ""},
    ],
}

# ── Interactive mode test cases ────────────────────────────────────────

INTERACTIVE_TESTS: dict[str, list[dict[str, Any]]] = {
    "socratic": [
        {"course_id": "database-principles-wk6", "topic": "normalisation", "student_message": "I don't understand why we need normalisation"},
        {"course_id": "database-principles-wk6", "topic": "primary keys", "student_message": "Can a table have two primary keys?"},
        {"course_id": "cyber-phys-system", "topic": "sensors", "student_message": "How do sensors communicate with controllers?"},
        {"course_id": "psle-science-revision", "topic": "photosynthesis", "student_message": "Why do plants need sunlight?"},
    ],
    "teach-back": [
        {"course_id": "database-principles-wk6", "topic": "primary keys", "student_explanation": "A primary key is a column that uniquely identifies each row in a table. It cannot be null and must be unique."},
        {"course_id": "database-principles-wk6", "topic": "normalisation", "student_explanation": "Normalisation is when you split tables into smaller ones to reduce data redundancy."},
        {"course_id": "cyber-phys-system", "topic": "cyber-physical systems", "student_explanation": "CPS are systems that combine computing with physical processes. They use sensors to monitor and actuators to control."},
        {"course_id": "psle-science-revision", "topic": "water cycle", "student_explanation": "Water evaporates from the sea, forms clouds, and then rains back down. This keeps repeating."},
    ],
    "scenario": [
        {"course_id": "database-principles-wk6", "topic": "database design"},
        {"course_id": "cyber-phys-system", "topic": "CPS security"},
        {"course_id": "psle-science-revision", "topic": "ecosystems"},
    ],
    "concept-map": [
        {"course_id": "database-principles-wk6", "topic": "relational databases"},
        {"course_id": "cyber-phys-system", "topic": "cyber-physical systems"},
        {"course_id": "psle-science-revision", "topic": "living things"},
    ],
    "illustrated-flashcards": [
        {"course_id": "database-principles-wk6", "topic": "SQL basics", "count": 4},
        {"course_id": "cyber-phys-system", "topic": "IoT and CPS", "count": 4},
        {"course_id": "psle-science-revision", "topic": "forces and energy", "count": 4},
    ],
    "revision-from-mistakes": [
        {
            "course_id": "database-principles-wk6",
            "mistakes": [
                {"question": "What is a primary key?", "student_answer": "A column that stores IDs", "correct_answer": "A column (or set of columns) that uniquely identifies each row", "topic": "keys"},
                {"question": "What does 1NF require?", "student_answer": "No duplicate rows", "correct_answer": "Atomic values in each cell, no repeating groups", "topic": "normalisation"},
            ],
        },
        {
            "course_id": "psle-science-revision",
            "mistakes": [
                {"question": "What gas do plants absorb?", "student_answer": "Oxygen", "correct_answer": "Carbon dioxide", "topic": "photosynthesis"},
                {"question": "What are the 3 states of matter?", "student_answer": "Solid, liquid, air", "correct_answer": "Solid, liquid, gas", "topic": "states of matter"},
            ],
        },
    ],
}


# ── Persona consistency queries (Section 8.4) ─────────────────────────
# 5 queries run across all 4 personas and 3 learning levels.

PERSONA_QUERIES: list[dict[str, str]] = [
    {"question": "What is a primary key?", "course_id": "database-principles-wk6"},
    {"question": "Explain normalisation.", "course_id": "database-principles-wk6"},
    {"question": "What is a cyber-physical system?", "course_id": "cyber-phys-system"},
    {"question": "Explain photosynthesis.", "course_id": "psle-science-revision"},
    {"question": "What are the states of matter?", "course_id": "psle-science-revision"},
]

PERSONAS = ["standard", "advocate", "joker", "socratic"]
LEVELS = ["beginner", "intermediate", "advanced"]


def _ts() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _post(client: httpx.Client, path: str, body: dict) -> dict:
    resp = client.post(path, json=body, timeout=120.0)
    resp.raise_for_status()
    return resp.json()


# ── Tier 1 & 2: RAG evaluation ────────────────────────────────────────

def run_rag_eval(client: httpx.Client) -> list[dict]:
    rows: list[dict] = []
    total = sum(len(qs) for qs in TEST_QUERIES.values())
    done = 0

    for course_id, queries in TEST_QUERIES.items():
        for qobj in queries:
            done += 1
            question = qobj["q"]
            print(f"  [{done}/{total}] {course_id}: {question[:60]}...")

            try:
                data = _post(client, "/rag/eval", {
                    "question": question,
                    "course_id": course_id,
                    "persona": "standard",
                    "learning_level": "intermediate",
                })
            except httpx.HTTPStatusError as exc:
                print(f"    ERROR {exc.response.status_code}: {exc.response.text[:200]}")
                rows.append({
                    "course_id": course_id,
                    "question": question,
                    "error": str(exc),
                })
                continue

            chunks_summary = []
            for i, chunk in enumerate(data.get("chunks", [])):
                chunks_summary.append({
                    "idx": i + 1,
                    "file": chunk.get("file", ""),
                    "page": chunk.get("page"),
                    "content_preview": chunk.get("content", "")[:300],
                    "metadata": chunk.get("metadata", {}),
                })

            rows.append({
                "course_id": course_id,
                "question": question,
                "expected_source_hint": qobj.get("expected_source_hint", ""),
                "answer": data.get("answer", ""),
                "sources": data.get("sources", []),
                "num_chunks": len(data.get("chunks", [])),
                "chunks": chunks_summary,
                # --- Tier 1 scoring columns (fill manually) ---
                "source_correct": "",         # YES / NO
                "chunks_relevant_count": "",  # 0-6: how many of 6 chunks are relevant
                "citation_metadata_ok": "",   # YES / NO
                # --- Tier 2 scoring columns (fill manually) ---
                "grounding_score": "",        # 1-5
                "citation_accuracy": "",      # YES / NO
                "hallucination": "",          # YES / NO
                "notes": "",
            })
            time.sleep(0.5)

    return rows


# ── Tier 3: Interactive mode evaluation ────────────────────────────────

def run_interactive_eval(client: httpx.Client) -> list[dict]:
    rows: list[dict] = []
    mode_count = sum(len(cases) for cases in INTERACTIVE_TESTS.values())
    done = 0

    for mode, cases in INTERACTIVE_TESTS.items():
        for case in cases:
            done += 1
            endpoint = f"/interactive/{mode}"
            label = f"{mode} | {case.get('course_id', '')} | {case.get('topic', case.get('course_id', ''))}"
            print(f"  [{done}/{mode_count}] {label}")

            try:
                data = _post(client, endpoint, case)
            except httpx.HTTPStatusError as exc:
                print(f"    ERROR {exc.response.status_code}: {exc.response.text[:200]}")
                rows.append({
                    "mode": mode,
                    "course_id": case.get("course_id", ""),
                    "topic": case.get("topic", ""),
                    "input_summary": json.dumps(case, default=str)[:300],
                    "error": str(exc),
                })
                continue

            rows.append({
                "mode": mode,
                "course_id": case.get("course_id", ""),
                "topic": case.get("topic", ""),
                "input_summary": json.dumps(case, default=str)[:300],
                "response_preview": json.dumps(data, default=str)[:1500],
                "full_response": data,
                # --- Tier 3 scoring columns (fill manually) ---
                "pedagogical_correctness": "",  # 1-5
                "content_accuracy": "",         # 1-5
                "usability": "",                # 1-5
                "notes": "",
            })
            time.sleep(1.0)

    return rows


# ── CSV export helpers ────────────────────────────────────────────────

def write_rag_csv(rows: list[dict], path: Path) -> None:
    fieldnames = [
        "course_id", "question", "expected_source_hint",
        "answer", "num_chunks",
        "source_1_file", "source_1_page",
        "source_2_file", "source_2_page",
        "source_3_file", "source_3_page",
        "chunk_1_file", "chunk_1_page", "chunk_1_preview",
        "chunk_2_file", "chunk_2_page", "chunk_2_preview",
        "chunk_3_file", "chunk_3_page", "chunk_3_preview",
        "chunk_4_file", "chunk_4_page", "chunk_4_preview",
        "chunk_5_file", "chunk_5_page", "chunk_5_preview",
        "chunk_6_file", "chunk_6_page", "chunk_6_preview",
        "source_correct", "chunks_relevant_count",
        "citation_metadata_ok",
        "grounding_score", "citation_accuracy", "hallucination",
        "notes",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            flat: dict[str, Any] = {
                "course_id": row.get("course_id", ""),
                "question": row.get("question", ""),
                "expected_source_hint": row.get("expected_source_hint", ""),
                "answer": (row.get("answer", "") or "")[:500],
                "num_chunks": row.get("num_chunks", ""),
                "source_correct": row.get("source_correct", ""),
                "chunks_relevant_count": row.get("chunks_relevant_count", ""),
                "citation_metadata_ok": row.get("citation_metadata_ok", ""),
                "grounding_score": row.get("grounding_score", ""),
                "citation_accuracy": row.get("citation_accuracy", ""),
                "hallucination": row.get("hallucination", ""),
                "notes": row.get("notes", ""),
            }
            for i, src in enumerate(row.get("sources", [])[:3], start=1):
                flat[f"source_{i}_file"] = src.get("file", "")
                flat[f"source_{i}_page"] = src.get("page", "")
            for i, ch in enumerate(row.get("chunks", [])[:6], start=1):
                flat[f"chunk_{i}_file"] = ch.get("file", "")
                flat[f"chunk_{i}_page"] = ch.get("page", "")
                flat[f"chunk_{i}_preview"] = ch.get("content_preview", "")[:200]
            writer.writerow(flat)


def write_interactive_csv(rows: list[dict], path: Path) -> None:
    fieldnames = [
        "mode", "course_id", "topic", "input_summary",
        "response_preview",
        "pedagogical_correctness", "content_accuracy", "usability",
        "notes",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({
                k: (str(row.get(k, ""))[:1500] if k == "response_preview" else row.get(k, ""))
                for k in fieldnames
            })


# ── Persona consistency evaluation ─────────────────────────────────────

def run_persona_eval(client: httpx.Client) -> list[dict]:
    rows: list[dict] = []
    total = len(PERSONA_QUERIES) * len(PERSONAS)
    done = 0

    for pq in PERSONA_QUERIES:
        for persona in PERSONAS:
            done += 1
            print(f"  [{done}/{total}] {persona} | {pq['question'][:50]}...")
            try:
                data = _post(client, "/rag/eval", {
                    "question": pq["question"],
                    "course_id": pq["course_id"],
                    "persona": persona,
                    "learning_level": "intermediate",
                })
            except httpx.HTTPStatusError as exc:
                print(f"    ERROR {exc.response.status_code}")
                rows.append({
                    "question": pq["question"],
                    "course_id": pq["course_id"],
                    "persona": persona,
                    "error": str(exc),
                })
                continue

            rows.append({
                "question": pq["question"],
                "course_id": pq["course_id"],
                "persona": persona,
                "answer_preview": (data.get("answer", "") or "")[:800],
                "has_citations": "YES" if "[" in data.get("answer", "") and ":" in data.get("answer", "") else "NO",
                "num_sources": len(data.get("sources", [])),
                # --- Scoring columns (fill manually) ---
                "citations_present": "",   # YES / NO
                "tone_correct": "",        # YES / NO
                "level_adaptation": "",    # YES / NO
                "notes": "",
            })
            time.sleep(0.5)

    return rows


def write_persona_csv(rows: list[dict], path: Path) -> None:
    fieldnames = [
        "question", "course_id", "persona",
        "answer_preview", "has_citations", "num_sources",
        "citations_present", "tone_correct", "level_adaptation",
        "notes",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: str(row.get(k, ""))[:800] for k in fieldnames})


# ── Main ──────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="VTA Evaluation Runner")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("VTA_BASE_URL", "http://localhost:8000"),
        help="Backend base URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--skip-rag", action="store_true",
        help="Skip Tier 1 & 2 (RAG evaluation)",
    )
    parser.add_argument(
        "--skip-interactive", action="store_true",
        help="Skip Tier 3 (interactive mode evaluation)",
    )
    parser.add_argument(
        "--skip-persona", action="store_true",
        help="Skip Tier 4 (persona consistency evaluation)",
    )
    parser.add_argument(
        "--courses", nargs="*",
        help="Only test specific courses (default: all)",
    )
    args = parser.parse_args()

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = _ts()
    client = httpx.Client(base_url=args.base_url)

    # Health check
    try:
        r = client.get("/health", timeout=10.0)
        r.raise_for_status()
        print(f"Connected to {args.base_url}")
    except Exception as exc:
        print(f"Cannot reach {args.base_url}/health — is the server running?\n{exc}")
        sys.exit(1)

    # Filter courses if requested
    if args.courses:
        for key in list(TEST_QUERIES.keys()):
            if key not in args.courses:
                del TEST_QUERIES[key]

    # ── Tier 1 & 2 ──
    if not args.skip_rag:
        print("\n=== Tier 1 & 2: RAG Retrieval + Answer Faithfulness ===")
        rag_rows = run_rag_eval(client)

        json_path = RESULTS_DIR / f"rag_eval_{ts}.json"
        csv_path = RESULTS_DIR / f"rag_eval_{ts}.csv"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(rag_rows, f, indent=2, default=str)
        write_rag_csv(rag_rows, csv_path)
        print(f"\n  Raw JSON → {json_path}")
        print(f"  Scoring CSV → {csv_path}")

    # ── Tier 3 ──
    if not args.skip_interactive:
        print("\n=== Tier 3: Interactive Mode Effectiveness ===")
        interactive_rows = run_interactive_eval(client)

        json_path = RESULTS_DIR / f"interactive_eval_{ts}.json"
        csv_path = RESULTS_DIR / f"interactive_eval_{ts}.csv"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(interactive_rows, f, indent=2, default=str)
        write_interactive_csv(interactive_rows, csv_path)
        print(f"\n  Raw JSON → {json_path}")
        print(f"  Scoring CSV → {csv_path}")

    # ── Persona consistency ──
    if not args.skip_persona:
        print("\n=== Persona Consistency Evaluation ===")
        persona_rows = run_persona_eval(client)

        json_path = RESULTS_DIR / f"persona_eval_{ts}.json"
        csv_path = RESULTS_DIR / f"persona_eval_{ts}.csv"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(persona_rows, f, indent=2, default=str)
        write_persona_csv(persona_rows, csv_path)
        print(f"\n  Raw JSON → {json_path}")
        print(f"  Scoring CSV → {csv_path}")

    print("\n=== Done! ===")
    print("Next steps:")
    print("  1. Open the CSV files in Excel/Google Sheets")
    print("  2. Fill in the scoring columns (highlighted in the headers)")
    print("  3. RAG CSV: source_correct, chunks_relevant_count, citation_metadata_ok,")
    print("     grounding_score, citation_accuracy, hallucination")
    print("  4. Interactive CSV: pedagogical_correctness, content_accuracy, usability")
    print("  5. Persona CSV: citations_present, tone_correct, level_adaptation")
    print("  6. Compute aggregate metrics for your report")

    client.close()


if __name__ == "__main__":
    main()
