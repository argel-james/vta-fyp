from dataclasses import dataclass
import os
from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class AzureSettings:
    # --- Chat (gpt-4o-mini) ---
    chat_endpoint: str = os.getenv("AZURE_OPENAI_ENDPOINT_CHAT", os.getenv("AZURE_OPENAI_ENDPOINT_GPT4o-mini", ""))
    chat_key: str = os.getenv("AZURE_OPENAI_API_KEY_CHAT", os.getenv("AZURE_OPENAI_API_KEY_GPT4o-mini", ""))
    chat_api_version: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    chat_deployment: str = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini")

    # --- Embeddings (text-embedding-3-small) ---
    embed_endpoint: str = os.getenv("AZURE_OPENAI_ENDPOINT_Embedding", "")
    embed_key: str = os.getenv("AZURE_OPENAI_API_KEY_Embedding", "")
    embed_api_version: str = os.getenv("AZURE_OPENAI_API_VERSION_Embedding", "2024-12-01-preview")
    embed_deployment: str = os.getenv("AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT", "text-embedding-3-small")
    embed_dimensions: int = int(os.getenv("AZURE_OPENAI_EMBEDDING_DIM", "1536"))

    # --- Index location ---
    index_dir: str = os.getenv("INDEX_DIR", "index/sc2107")

    def validate(self):
        missing = []
        if not self.chat_endpoint:    missing.append("AZURE_OPENAI_ENDPOINT_CHAT")
        if not self.chat_key:         missing.append("AZURE_OPENAI_API_KEY_CHAT")
        if not self.chat_deployment:  missing.append("AZURE_OPENAI_CHAT_DEPLOYMENT")
        if not self.chat_api_version: missing.append("AZURE_OPENAI_API_VERSION")

        if not self.embed_endpoint:    missing.append("AZURE_OPENAI_ENDPOINT_Embedding")
        if not self.embed_key:         missing.append("AZURE_OPENAI_API_KEY_Embedding")
        if not self.embed_deployment:  missing.append("AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT")
        if not self.embed_api_version: missing.append("AZURE_OPENAI_API_VERSION_Embedding")

        if missing:
            raise RuntimeError("Missing env vars: " + ", ".join(missing))

    def warn_if_endpoint_looks_wrong(self):
        for label, url in [("chat", self.chat_endpoint), ("embed", self.embed_endpoint)]:
            if url and ".openai.azure.com" not in url:
                print(f"[WARN] {label} endpoint does not contain '.openai.azure.com': {url}\n"
                      f"       Make sure you used the Azure OpenAI *resource* endpoint "
                      f"(e.g., https://<resource>.openai.azure.com/).")