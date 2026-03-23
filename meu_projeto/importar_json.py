import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "meu_projeto.settings")
django.setup()

from financeiro_app.models import Despesa, Receita


with open("gastos-pessoais-backup-2026-03-01.json", "r", encoding="utf-8") as f:
    dados = json.load(f)


for item in dados["expenses"]:
    Despesa.objects.create(
        data=item["date"],
        vencimento=item["dueDate"],
        categoria=item["category"],
        descricao=item["description"],
        valor=item["amount"],
        paga=item["isPaid"],
        recorrente=item["isRecurring"],
    )


for item in dados["incomes"]:
    Receita.objects.create(
        data=item["date"],
        vencimento=item["dueDate"],
        tipo=item["type"],
        descricao=item["description"],
        valor=item["amount"],
        recebida=item["isReceived"],
        recorrente=item["isRecurring"],
    )

print("✅ Importação concluída")