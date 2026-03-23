from django.shortcuts import render
from .models import Despesa, Receita
from django.db.models import Sum


def dashboard(request):

    # Valores realizados
    receitas_recebidas = Receita.objects.filter(recebida=True).aggregate(Sum('valor'))['valor__sum'] or 0
    despesas_pagas = Despesa.objects.filter(paga=True).aggregate(Sum('valor'))['valor__sum'] or 0

    saldo_atual = receitas_recebidas - despesas_pagas

    # Valores futuros
    receitas_previstas = Receita.objects.filter(recebida=False).aggregate(Sum('valor'))['valor__sum'] or 0
    despesas_pendentes = Despesa.objects.filter(paga=False)

    total_despesas_pendentes = despesas_pendentes.aggregate(Sum('valor'))['valor__sum'] or 0

    saldo_previsto = saldo_atual + receitas_previstas - total_despesas_pendentes

    # Para tabela
    pendentes = despesas_pendentes[:5]

    # Gráfico categorias
    categorias = (
        Despesa.objects
        .filter(paga=True)
        .values('categoria')
        .annotate(total=Sum('valor'))
    )

    labels = [c['categoria'] for c in categorias]
    valores = [float(c['total']) for c in categorias]

    context = {
        'receitas': receitas_recebidas,
        'despesas': despesas_pagas,
        'saldo': saldo_atual,
        'saldo_previsto': saldo_previsto,
        'pendentes': pendentes,
        'labels': labels,
        'valores': valores,
    }

    return render(request, 'financeiro_app/dashboard.html', context)