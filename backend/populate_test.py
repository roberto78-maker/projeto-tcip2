from custodia.models import Apreensao, LoteIncineracao
import random

def fill_lote(num):
    lote, _ = LoteIncineracao.objects.get_or_create(
        numero=num, 
        defaults={'ano': 2026, 'origem': '1ºC6BPM'}
    )
    current_cnt = Apreensao.objects.filter(lote_incineracao=lote).count()
    print(f"Lote {num} tem {current_cnt} itens. Criando {20 - current_cnt} itens...")
    
    for i in range(current_cnt, 20):
        Apreensao.objects.create(
            bou=f"TEST-L{num}-{i+1}",
            processo=f"PROCESSO-TEST-{num}",
            reu="AUTOR DE TESTE",
            substancia=random.choice(["MACONHA", "COCAÍNA", "CRACK"]),
            peso=random.uniform(0.1, 5.0),
            unidade="Kg",
            status="incineracao",
            lote_incineracao=lote
        )

for n in [1, 2, 3]:
    fill_lote(n)
print("Concluído!")
