from django.shortcuts import render
from .models import Ocorrencia

def lista_ocorrencias(request):

    ocorrencias = Ocorrencia.objects.all()

    return render(request, 'ocorrencias/lista.html', {
        'ocorrencias': ocorrencias
    })
from django.shortcuts import redirect
from .forms import OcorrenciaForm


def nova_ocorrencia(request):

    if request.method == 'POST':

        form = OcorrenciaForm(request.POST)

        if form.is_valid():
            form.save()
            return redirect('/ocorrencias/')

    else:

        form = OcorrenciaForm()

    return render(request, 'ocorrencias/nova.html', {
        'form': form
    })
from django.shortcuts import get_object_or_404


def detalhe_ocorrencia(request, id):

    ocorrencia = get_object_or_404(Ocorrencia, id=id)

    return render(request, 'ocorrencias/detalhe.html', {
        'ocorrencia': ocorrencia
    })
def relatorio_ocorrencia(request, id):

    ocorrencia = Ocorrencia.objects.get(id=id)

    texto = f"""
RELATÓRIO POLICIAL

Data: {ocorrencia.data}
Hora: {ocorrencia.hora}
Cidade: {ocorrencia.cidade}
Bairro: {ocorrencia.bairro}

Natureza da ocorrência:
{ocorrencia.natureza}

Descrição dos fatos:

{ocorrencia.descricao}

"""

    return render(request, 'ocorrencias/relatorio.html', {
        'texto': texto
    })
def release_ocorrencia(request, id):

    ocorrencia = Ocorrencia.objects.get(id=id)

    texto = f"""
RELEASE POLICIAL

A Polícia Militar registrou uma ocorrência de {ocorrencia.natureza}
na cidade de {ocorrencia.cidade}, bairro {ocorrencia.bairro},
no dia {ocorrencia.data} às {ocorrencia.hora}.

De acordo com o boletim registrado, {ocorrencia.descricao}

A ocorrência foi encaminhada para os procedimentos legais cabíveis.
"""

    return render(request, 'ocorrencias/release.html', {
        'texto': texto
    })