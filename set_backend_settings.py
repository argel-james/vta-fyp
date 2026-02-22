#!/usr/bin/env python3
"""Set Azure App Service settings for the backend via az rest."""
import subprocess, json, sys

settings = {
    "AZURE_OPENAI_API_KEY_CHAT": "DRJcOdVCZu1Tatcbi1t4hlS3an9yWZESdE3mqbUwktSvCBmt8nGkJQQJ99BIACHYHv6XJ3w3AAAAACOGA1Co",
    "AZURE_OPENAI_ENDPOINT_CHAT": "https://argel-mfkqibiy-eastus2.openai.azure.com/",
    "AZURE_OPENAI_API_VERSION": "2024-12-01-preview",
    "AZURE_OPENAI_API_KEY_Embedding": "BbjhhorwfbJvBP6YM79MBPu1hvXHg0cgQCdFqKVVreffyjmaXG5AJQQJ99BBACYeBjFXJ3w3AAAAACOGaSrZ",
    "AZURE_OPENAI_ENDPOINT_Embedding": "https://ai-argel001ai4655162818494611.openai.azure.com/",
    "AZURE_OPENAI_API_VERSION_Embedding": "2024-12-01-preview",
    "AZURE_OPENAI_CHAT_DEPLOYMENT": "gpt-4o-mini",
    "AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT": "text-embedding-3-small",
    "VTA_INDEX_DIR": "./index",
    "VTA_DATABASE_URL": "mysql+pymysql://vtaadmin:ilovetits69!123@vta-mysql-server.mysql.database.azure.com:3306/vta_database_system",
    "VTA_SECRET_KEY": "W4i2rcIm9ly2wHWW2x-CPVMPVewsD9mrY8Duw_iH1I1Cy8xHonMyclTNHGMiAP29FgpWNSAavS8GC20r0uJwjQ",
    "VTA_EMAIL_CONNECTION_STR": "endpoint=https://vta-comm-service.asiapacific.communication.azure.com/;accesskey=APfEB1YZYXp4JAXNWQHKNqraF9dFquVrhiGu9NP1YNtprSKcFQ8OJQQJ99BKACULyCpxnnhMAAAAAZCSpb13",
    "VTA_FROM_EMAIL": "DoNotReply@65e00946-7659-4570-b17b-9f7e8ed1c267.azurecomm.net",
    "VTA_ALLOWED_ORIGINS": '["https://vta-frontend-app.azurewebsites.net","http://localhost:3000"]',
    "WEBSITES_PORT": "8000",
}

sub_id = "3a46a669-dffb-41e4-a80c-e25724261bfa"
rg = "fyp-vta"
app = "vta-backend-app"
uri = f"/subscriptions/{sub_id}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/config/appsettings?api-version=2024-04-01"

body = json.dumps({"properties": settings})

result = subprocess.run(
    ["az", "rest", "--method", "PUT", "--uri", uri, "--body", body, "-o", "none"],
    capture_output=True, text=True,
)

print("STDOUT:", result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
print("Return code:", result.returncode)
sys.exit(result.returncode)
