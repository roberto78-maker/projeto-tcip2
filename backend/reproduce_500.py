import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from custodia.models import Apreensao

try:
    a = Apreensao.objects.create(
        processo="0000001-01.2026",
        bou="2026/123",
        reu="TESTE",
        natureza="AMEACA",
        substancia="NÃO HÁ APREENSÃO",
        descricao="NATUREZA TESTE",
        peso=0,
        unidade="Unid",
        status="arquivado",
        lacre="",
        vara="VARA TESTE",
        policial="SD TESTE",
        tem_apreensao=False
    )
    print(f"Sucesso: {a}")
except Exception as e:
    import traceback
    traceback.print_exc()
