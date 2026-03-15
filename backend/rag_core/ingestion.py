from __future__ import annotations

import logging
import re
from pathlib import Path

from langchain_community.document_loaders import (
    Docx2txtLoader,
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
    UnstructuredPowerPointLoader,
)
from langchain_community.vectorstores import FAISS
from langchain_openai import AzureOpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import AzureSettings

logger = logging.getLogger(__name__)

_LOADER_MAP = {
    ".pdf": lambda p: PyPDFLoader(str(p)),
    ".pptx": lambda p: UnstructuredPowerPointLoader(str(p)),
    ".ppt": lambda p: UnstructuredPowerPointLoader(str(p)),
    ".docx": lambda p: Docx2txtLoader(str(p)),
    ".md": lambda p: UnstructuredMarkdownLoader(str(p)),
    ".txt": lambda p: TextLoader(str(p), encoding="utf-8"),
}


def load_all_documents(root: Path):
    docs = []
    for path in root.rglob("*"):
        if not path.is_file() or path.name.startswith("."):
            continue
        ext = path.suffix.lower()
        loader_fn = _LOADER_MAP.get(ext)
        if loader_fn is None:
            continue

        try:
            loader = loader_fn(path)
            file_docs = loader.load()
        except Exception:
            logger.exception("Failed to load %s", path.name)
            continue

        week = None
        m = re.search(r"week[_\s-]?(\d+)", path.name, flags=re.I)
        if m:
            week = int(m.group(1))

        topic_m = re.search(r"T(\d+)\s*(.+?)(?:\s*-\s*Full)?\.pdf$", path.name, flags=re.I)

        for d in file_docs:
            d.metadata.setdefault("source", str(path))
            d.metadata["filename"] = path.name
            if week is not None:
                d.metadata["week"] = week
            if topic_m:
                d.metadata["topic_number"] = int(topic_m.group(1))
                d.metadata["topic_label"] = topic_m.group(2).strip()

        docs.extend(file_docs)

    logger.info("Loaded %d pages/sections from %s", len(docs), root)
    return docs


def split_docs(docs, chunk_size: int = 800, chunk_overlap: int = 200):
    """Split documents into chunks with structure-aware separators.

    Uses a smaller chunk_size (800) with higher overlap (200) to preserve
    context while keeping chunks focused enough for accurate retrieval.
    The separators prioritise structural boundaries (double newline,
    numbered lists, bullet points) before falling back to sentences.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",
            "\n",
            ". ",
            "? ",
            "! ",
            "; ",
            ", ",
            " ",
            "",
        ],
        keep_separator=True,
    )
    chunks = splitter.split_documents(docs)
    logger.info("Split into %d chunks (size=%d, overlap=%d)", len(chunks), chunk_size, chunk_overlap)
    return chunks


def build_faiss_index(chunks, index_dir: Path, settings: AzureSettings):
    settings.validate()
    settings.warn_if_endpoint_looks_wrong()

    if not chunks:
        logger.warning("No chunks to index — skipping FAISS build")
        return str(index_dir)

    embeddings = AzureOpenAIEmbeddings(
        azure_endpoint=settings.embed_endpoint,
        api_key=settings.embed_key,
        api_version=settings.embed_api_version,
        azure_deployment=settings.embed_deployment,
        dimensions=settings.embed_dimensions,
    )
    vs = FAISS.from_documents(chunks, embedding=embeddings)
    index_dir.mkdir(parents=True, exist_ok=True)
    vs.save_local(str(index_dir))
    logger.info("FAISS index saved to %s (%d vectors)", index_dir, len(chunks))
    return str(index_dir)
