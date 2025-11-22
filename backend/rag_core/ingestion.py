from pathlib import Path
import re
from langchain_community.document_loaders import (
    PyPDFLoader,
    UnstructuredPowerPointLoader,
    Docx2txtLoader,
    UnstructuredMarkdownLoader,
    TextLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import AzureOpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from .config import AzureSettings

def load_all_documents(root: Path):
    docs = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        ext = path.suffix.lower()
        if ext == ".pdf":
            loader = PyPDFLoader(str(path))
        elif ext in (".pptx", ".ppt"):
            loader = UnstructuredPowerPointLoader(str(path))
        elif ext == ".docx":
            loader = Docx2txtLoader(str(path))
        elif ext == ".md":
            loader = UnstructuredMarkdownLoader(str(path))
        elif ext == ".txt":
            loader = TextLoader(str(path), encoding="utf-8")
        else:
            continue
        file_docs = loader.load()

        # infer "week" from filename, e.g., Week02_..., week-02-...
        week = None
        m = re.search(r"week[_\s-]?(\d+)", path.name, flags=re.I)
        if m:
            week = int(m.group(1))
        for d in file_docs:
            d.metadata.setdefault("source", str(path))
            if week is not None:
                d.metadata["week"] = week

        docs.extend(file_docs)
    return docs

def split_docs(docs, chunk_size=1200, chunk_overlap=150):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    return splitter.split_documents(docs)

def build_faiss_index(chunks, index_dir: Path, settings: AzureSettings):
    settings.validate()
    settings.warn_if_endpoint_looks_wrong()
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
    return str(index_dir)