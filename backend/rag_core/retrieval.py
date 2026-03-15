from __future__ import annotations

from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_openai import AzureOpenAIEmbeddings

from .config import AzureSettings


def load_retriever(
    index_dir: Path,
    settings: AzureSettings,
    k: int = 6,
    fetch_k: int = 25,
):
    """Load a FAISS-backed retriever using MMR for diverse results.

    Args:
        k: Number of documents to return (default raised to 6 for richer context).
        fetch_k: Number of candidates to fetch before MMR re-ranking.
    """
    settings.validate()
    settings.warn_if_endpoint_looks_wrong()
    embeddings = AzureOpenAIEmbeddings(
        azure_endpoint=settings.embed_endpoint,
        api_key=settings.embed_key,
        api_version=settings.embed_api_version,
        azure_deployment=settings.embed_deployment,
    )
    vs = FAISS.load_local(str(index_dir), embeddings, allow_dangerous_deserialization=True)
    return vs.as_retriever(
        search_type="mmr",
        search_kwargs={"k": k, "fetch_k": fetch_k, "lambda_mult": 0.7},
    )


def load_retriever_with_k(
    index_dir: Path,
    settings: AzureSettings,
    k: int,
):
    """Convenience wrapper to load a retriever with a custom k."""
    return load_retriever(index_dir, settings, k=k, fetch_k=max(k * 4, 25))
