import argparse
from pathlib import Path
from rag_core.config import AzureSettings
from rag_core.ingestion import load_all_documents, split_docs, build_faiss_index

def main():
    p = argparse.ArgumentParser(description="Ingest and build FAISS index")
    p.add_argument("--data", type=Path, required=True, help="Folder with module files")
    p.add_argument("--index", type=Path, required=True, help="Folder to store FAISS index")
    p.add_argument("--chunk_size", type=int, default=1200)
    p.add_argument("--chunk_overlap", type=int, default=150)
    args = p.parse_args()

    settings = AzureSettings(); settings.validate()
    docs = load_all_documents(args.data)
    if not docs:
        print("No documents found. Place files under the data directory.")
        return
    chunks = split_docs(docs, args.chunk_size, args.chunk_overlap)
    out = build_faiss_index(chunks, args.index, settings)
    print(f"Indexed {len(chunks)} chunks -> {out}")

if __name__ == "__main__":
    main()