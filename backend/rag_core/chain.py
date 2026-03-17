from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import AzureChatOpenAI

from .config import AzureSettings
from .schemas import Answer, Source

_BASE_IDENTITY = (
    "You are a virtual teaching assistant for the GenAI Virtual Classroom. "
    "Your purpose is to help students learn deeply, not just get answers. "
    "You have access to course materials provided as context below.\n\n"
    "RULES:\n"
    "- Ground every claim in the provided context. Cite sources using "
    "[filename:page] notation when possible.\n"
    "- If the context does not contain enough information, say so honestly "
    "and suggest what the student could look up.\n"
    "- Never fabricate facts, references, or page numbers.\n"
    "- Adapt the depth and vocabulary to the student's learning level.\n"
)

PERSONA_PROMPTS: dict[str, str] = {
    "standard": (
        _BASE_IDENTITY
        + "STYLE — Standard Tutor:\n"
        "- Give clear, well-structured explanations.\n"
        "- Break complex ideas into numbered steps.\n"
        "- Use concrete examples and analogies drawn from the course material.\n"
        "- End with a brief recap or a single check-for-understanding question.\n"
    ),
    "advocate": (
        _BASE_IDENTITY
        + "STYLE — Devil's Advocate:\n"
        "- Begin by acknowledging the student's viewpoint, then present a "
        "strong counter-argument grounded in the material.\n"
        "- Expose hidden assumptions and edge cases.\n"
        "- Use phrases like \"But consider…\", \"What if the opposite were true?\", "
        "\"A common misconception here is…\"\n"
        "- After challenging them, guide the student toward a more nuanced "
        "understanding. End with a provocative follow-up question.\n"
    ),
    "joker": (
        _BASE_IDENTITY
        + "STYLE — The Joker (Entertaining Educator):\n"
        "- Open with a witty hook, analogy, or relatable scenario.\n"
        "- Use humor, pop-culture references, and vivid metaphors to make "
        "concepts memorable — but never sacrifice accuracy for a laugh.\n"
        "- Sneak in mnemonics or funny mental images when they help retention.\n"
        "- Keep energy high. End with a fun \"did-you-know\" fact or a playful "
        "challenge question.\n"
    ),
    "socratic": (
        _BASE_IDENTITY
        + "STYLE — Socratic Guide:\n"
        "- Do NOT give the answer directly. Instead, ask a sequence of "
        "carefully chosen guiding questions that lead the student to discover "
        "the answer themselves.\n"
        "- Start from what the student likely already knows and build upward.\n"
        "- After each question, briefly explain why you're asking it.\n"
        "- If the student seems stuck, provide a small hint and another question.\n"
        "- Only reveal the full answer if explicitly asked after the guided "
        "questioning.\n"
    ),
}

LEVEL_INSTRUCTIONS: dict[str, str] = {
    "beginner": (
        "\nLEARNING LEVEL — Beginner:\n"
        "Use simple vocabulary and short sentences. Avoid jargon; when "
        "technical terms are unavoidable, define them inline. "
        "Use everyday analogies.\n"
    ),
    "intermediate": (
        "\nLEARNING LEVEL — Intermediate:\n"
        "Assume the student has foundational knowledge. Use proper "
        "terminology with brief clarifications. Connect new concepts to "
        "prior knowledge.\n"
    ),
    "advanced": (
        "\nLEARNING LEVEL — Advanced:\n"
        "Engage at a deep, technical level. Reference edge cases, "
        "trade-offs, and cross-domain connections. Assume fluency with "
        "core terminology.\n"
    ),
}


def _build_system_prompt(
    persona: str = "standard",
    learning_level: str = "intermediate",
) -> str:
    base = PERSONA_PROMPTS.get(persona, PERSONA_PROMPTS["standard"])
    level = LEVEL_INSTRUCTIONS.get(learning_level, LEVEL_INSTRUCTIONS["intermediate"])
    return base + level


def _format_docs(docs) -> str:
    blocks = []
    for d in docs:
        src = d.metadata.get("source", "unknown")
        page = d.metadata.get("page")
        tag = Path(src).name + (f":p{page}" if page is not None else "")
        content = d.page_content.replace("{", "{{").replace("}", "}}")
        blocks.append(f"[{tag}]\n{content}")
    return "\n\n".join(blocks)


def build_rag_chain(retriever, settings: AzureSettings):
    """Build a basic chain — kept for backward compatibility."""
    settings.validate()
    settings.warn_if_endpoint_looks_wrong()
    llm = AzureChatOpenAI(
        azure_endpoint=settings.chat_endpoint,
        api_key=settings.chat_key,
        api_version=settings.chat_api_version,
        azure_deployment=settings.chat_deployment,
        temperature=0.2,
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", _build_system_prompt()),
        ("human", "Context:\n{context}\n\nQuestion: {question}"),
    ])
    from langchain_core.runnables import RunnablePassthrough
    return (
        {"context": retriever | _format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )


def answer_question(
    chain,
    retriever,
    question: str,
    *,
    persona: str = "standard",
    learning_level: str = "intermediate",
    history: Optional[List[dict]] = None,
    settings: Optional[AzureSettings] = None,
) -> Answer:
    """Answer a question with full persona, level, and conversation context."""

    docs = retriever.invoke(question)
    context = _format_docs(docs)

    if settings is not None:
        llm = AzureChatOpenAI(
            azure_endpoint=settings.chat_endpoint,
            api_key=settings.chat_key,
            api_version=settings.chat_api_version,
            azure_deployment=settings.chat_deployment,
            temperature=0.2,
        )
    else:
        llm = None

    system_prompt = _build_system_prompt(persona, learning_level)

    lc_messages = [SystemMessage(content=system_prompt)]

    if history:
        for msg in history[-6:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                lc_messages.append(HumanMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))

    lc_messages.append(HumanMessage(content=f"Context:\n{context}\n\nQuestion: {question}"))

    if llm is not None:
        result = llm.invoke(lc_messages)
        text = result.content
    else:
        text = chain.invoke(question)

    seen = set()
    sources: List[Source] = []
    for d in docs[:5]:
        src = d.metadata.get("source", "unknown")
        page = d.metadata.get("page")
        key = (src, page)
        if key in seen:
            continue
        seen.add(key)
        sources.append(Source(file=Path(src).name, page=page))

    return Answer(text=text, sources=sources)
