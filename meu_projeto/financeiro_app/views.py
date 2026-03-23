from django.shortcuts import render
from .models import Despesa, Receita
from django.db.models import Sum


def dashboard(request):

    receitas_total = Receita.objects.filter(recebida=True).aggregate(Sum('valor'))['valor__sum'] or 0
    despesas_total = Despesa.objects.filter(paga=True).aggregate(Sum('valor'))['valor__sum'] or 0
    saldo = receitas_total - despesas_total

    pendentes = Despesa.objects.filter(paga=False)[:5]

    # Gastos por categoria
    categorias = (
        Despesa.objects
        .filter(paga=True)
        .values('categoria')
        .annotate(total=Sum('valor'))
    )

    labels = [c['categoria'] for c in categorias]
    valores = [float(c['total']) for c in categorias]

    context = {
        'receitas': receitas_total,
        'despesas': despesas_total,
        'saldo': saldo,
        'pendentes': pendentes,
        'labels': labels,
        'valores': valores,
    }

    return render(request, 'financeiro_app/dashboard.html', context)