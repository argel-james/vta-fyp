from pathlib import Path
from langchain_openai import AzureOpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from .config import AzureSettings

def load_retriever(index_dir: Path, settings: AzureSettings, k: int = 5, fetch_k: int = 20):
    settings.validate()
    settings.warn_if_endpoint_looks_wrong()
    embeddings = AzureOpenAIEmbeddings(
        azure_endpoint=settings.embed_endpoint,
        api_key=settings.embed_key,
        api_version=settings.embed_api_version,
        azure_deployment=settings.embed_deployment,
    )
    vs = FAISS.load_local(str(index_dir), embeddings, allow_dangerous_deserialization=True)
    return vs.as_retriever(search_type="mmr", search_kwargs={"k": k, "fetch_k": fetch_k})