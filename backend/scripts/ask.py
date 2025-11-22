import argparse
from pathlib import Path
from rag_core.config import AzureSettings
from rag_core.retrieval import load_retriever
from rag_core.chain import build_rag_chain, answer_question

def main():
    p = argparse.ArgumentParser(description="Ask a RAG question against the FAISS index")
    p.add_argument("--index", type=Path, required=True, help="FAISS index folder")
    p.add_argument("--q", "--question", dest="question", type=str, required=False)
    args = p.parse_args()

    settings = AzureSettings(); settings.validate()
    retriever = load_retriever(args.index, settings)
    chain = build_rag_chain(retriever, settings)

    if args.question:
        ans = answer_question(chain, retriever, args.question)
        print("\nAnswer:\n" + ans.text)
        if ans.sources:
            print("\nSources: " + "; ".join(
                [f"{s.file}" + (f":p{s.page}" if s.page is not None else "") for s in ans.sources]
            ))
        return

    print("Interactive mode. Ctrl+C to exit.")
    try:
        while True:
            q = input("\n> ")
            ans = answer_question(chain, retriever, q)
            print("\nAnswer:\n" + ans.text)
            if ans.sources:
                print("\nSources: " + "; ".join(
                    [f"{s.file}" + (f":p{s.page}" if s.page is not None else "") for s in ans.sources]
                ))
    except KeyboardInterrupt:
        print("\nBye.")

if __name__ == "__main__":
    main()