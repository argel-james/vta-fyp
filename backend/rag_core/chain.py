from pathlib import Path
from typing import List
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import AzureChatOpenAI
from .config import AzureSettings
from .schemas import Answer, Source

SYSTEM = """You are a teaching assistant for a single university module.
Answer ONLY from the given context. If the answer is not in the context,
say you do not know. Include file names and page numbers in square brackets
when applicable. Be concise and accurate."""

PROMPT = ChatPromptTemplate.from_messages(
    [("system", SYSTEM), ("human", "Question: {question}\n\nContext:\n{context}")]
)

def _format_docs(docs) -> str:
    blocks = []
    for d in docs:
        src = d.metadata.get("source", "unknown")
        page = d.metadata.get("page")
        tag = Path(src).name + (f":p{page}" if page is not None else "")
        blocks.append(f"[{tag}]\n{d.page_content}")
    return "\n\n".join(blocks)

def build_rag_chain(retriever, settings: AzureSettings):
    settings.validate()
    settings.warn_if_endpoint_looks_wrong()
    llm = AzureChatOpenAI(
        azure_endpoint=settings.chat_endpoint,
        api_key=settings.chat_key,
        api_version=settings.chat_api_version,
        azure_deployment=settings.chat_deployment,
        temperature=0.0,
    )
    return (
        {"context": retriever | _format_docs, "question": RunnablePassthrough()}
        | PROMPT
        | llm
        | StrOutputParser()
    )

def answer_question(chain, retriever, question: str) -> Answer:
    text = chain.invoke(question)
    docs = retriever.invoke(question)
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