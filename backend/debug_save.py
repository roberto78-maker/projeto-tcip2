import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from custodia.models import Apreensao

data = {
    "processo": "0001-TESTE",
    "bou": "BOU-2026-TESTE",
    "reu": "TESTE DE SISTEMA",
    "natureza": "OUTROS",
    "substancia": "NÃO HÁ APREENSÃO",
    "descricao": "TESTE DE SALVAMENTO SEM APREENSAO",
    "peso": 0.0,
    "unidade": "Unid",
    "status": "arquivado",
    "lacre": "",
    "vara": "VARA TESTE",
    "policial": "SD TESTE",
    "tem_apreensao": False
}

try:
    print("Tentando criar registro sem apreensão...")
    obj = Apreensao.objects.create(**data)
    print(f"Sucesso! ID: {obj.id}")
except Exception as e:
    print(f"ERRO ENCONTRADO: {type(e).__name__}: {str(e)}")
