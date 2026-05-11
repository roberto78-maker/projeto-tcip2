"""
Script para executar a migração de VARA -> JUIZADO no banco de produção (Render).
Execute após o deploy do Render completar.

Uso:
  python migrar_varas_producao.py --dry-run   (apenas mostra o que será mudado)
  python migrar_varas_producao.py             (executa a migração real)

Requer:
  - pip install requests
  - As credenciais de superusuário do sistema
"""
import sys
import requests

PRODUCAO_URL = "https://backend-tcip.onrender.com"
DRY_RUN = "--dry-run" in sys.argv

# ─── Login ────────────────────────────────────────────────────────────────────
usuario = input("Usuário (superuser): ").strip()
senha = input("Senha: ").strip()

print(f"\n{'[DRY-RUN] ' if DRY_RUN else ''}Autenticando em {PRODUCAO_URL}...")

login_resp = requests.post(
    f"{PRODUCAO_URL}/api/token/",
    json={"username": usuario, "password": senha},
)

if login_resp.status_code != 200:
    print(f"❌ Erro no login: {login_resp.status_code} - {login_resp.text}")
    sys.exit(1)

token = login_resp.json()["access"]
print("✅ Login OK!")

# ─── Executa a migração ───────────────────────────────────────────────────────
print(f"\nExecutando migração {'(DRY-RUN)' if DRY_RUN else 'REAL'}...")

resp = requests.post(
    f"{PRODUCAO_URL}/api/admin/fix-varas-juizados/",
    json={"dry_run": DRY_RUN},
    headers={"Authorization": f"Bearer {token}"},
)

if resp.status_code != 200:
    print(f"❌ Erro: {resp.status_code} - {resp.text}")
    sys.exit(1)

data = resp.json()
print(f"\nResultado: {data['mensagem']}")

if data["alteracoes"]:
    print("\nAlterações:")
    for alt in data["alteracoes"]:
        print(f"  • '{alt['de']}' → '{alt['para']}': {alt['registros']} registro(s)")
else:
    print("\n⚠️  Nenhum registro com valores antigos 'VARA' encontrado.")
    print("   (Pode ser que a migração já foi feita ou os dados já estavam corretos)")

if data["nao_mapeados_ainda"]:
    print(f"\n⚠️  Registros não mapeados (verifique manualmente): {data['nao_mapeados_ainda']}")
