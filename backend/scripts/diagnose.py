import os
from dotenv import load_dotenv
from langchain_openai import AzureOpenAIEmbeddings, AzureChatOpenAI

def ok(m): print(f"[OK] {m}")
def warn(m): print(f"[WARN] {m}")
def fail(m): print(f"[FAIL] {m}")

def main():
    load_dotenv()

    chat_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT_GPT4o-mini", "")
    chat_key = os.getenv("AZURE_OPENAI_API_KEY_GPT4o-mini", "")
    chat_api = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    chat_deploy = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "")

    emb_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT_Embedding", "")
    emb_key = os.getenv("AZURE_OPENAI_API_KEY_Embedding", "")
    emb_api = os.getenv("AZURE_OPENAI_API_VERSION_Embedding", "2024-12-01-preview")
    emb_deploy = os.getenv("AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT", "")
    dim = int(os.getenv("AZURE_OPENAI_EMBEDDING_DIM", "1536"))

    print("== Using env ==")
    print("Chat endpoint :", chat_endpoint)
    print("Chat deploy   :", chat_deploy)
    print("Emb endpoint  :", emb_endpoint)
    print("Emb deploy    :", emb_deploy)

    missing = []
    for name, val in [
        ("AZURE_OPENAI_ENDPOINT_GPT4o-mini", chat_endpoint),
        ("AZURE_OPENAI_API_KEY_GPT4o-mini", chat_key),
        ("AZURE_OPENAI_CHAT_DEPLOYMENT", chat_deploy),
        ("AZURE_OPENAI_ENDPOINT_Embedding", emb_endpoint),
        ("AZURE_OPENAI_API_KEY_Embedding", emb_key),
        ("AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT", emb_deploy),
    ]:
        if not val: missing.append(name)
    if missing:
        fail("Missing: " + ", ".join(missing)); return

    # warn if endpoints don't look like Azure OpenAI resource endpoints
    for label, url in [("chat", chat_endpoint), ("embed", emb_endpoint)]:
        if ".openai.azure.com" not in url:
            warn(f"{label} endpoint doesn't contain '.openai.azure.com' → double-check in Azure Portal (Keys & Endpoint).")

    # Test embeddings
    try:
        emb = AzureOpenAIEmbeddings(
            azure_endpoint=emb_endpoint,
            api_key=emb_key,
            api_version=emb_api,
            azure_deployment=emb_deploy,
            dimensions=dim,
        )
        vec = emb.embed_query("ping")
        ok(f"Embeddings OK (deployment '{emb_deploy}', dim={len(vec)})")
    except Exception as e:
        fail(f"Embeddings test failed: {e}"); return

    # Test chat
    try:
        llm = AzureChatOpenAI(
            azure_endpoint=chat_endpoint,
            api_key=chat_key,
            api_version=chat_api,
            azure_deployment=chat_deploy,
            temperature=0.0,
        )
        resp = llm.invoke("Reply with exactly: PONG").content.strip()
        if resp == "PONG":
            ok(f"Chat OK (deployment '{chat_deploy}')")
        else:
            warn(f"Chat reachable but literal differed: {resp!r}")
    except Exception as e:
        fail(f"Chat test failed: {e}"); return

    ok("Both deployments reachable and working.")

if __name__ == "__main__":
    main()