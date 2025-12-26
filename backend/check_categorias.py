import httpx

endpoints = [
    "/api/v1/orcamento/custos/test",
    "/api/v1/orcamento/custos/tipos",
]

for ep in endpoints:
    try:
        response = httpx.get(f"http://localhost:8000{ep}", timeout=10)
        print(f"{ep}: {response.status_code} - {response.text[:100]}")
    except Exception as e:
        print(f"{ep}: ERRO - {e}")

