import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Apreensao, LoteIncineracao
from .serializers import ApreensaoSerializer, LoteIncineracaoSerializer

logger = logging.getLogger(__name__)


class LoteIncineracaoViewSet(viewsets.ModelViewSet):
    queryset = LoteIncineracao.objects.all().order_by("-data_criacao")
    serializer_class = LoteIncineracaoSerializer


class ApreensaoViewSet(viewsets.ModelViewSet):
    queryset = Apreensao.objects.all().order_by("-data_criacao")
    serializer_class = ApreensaoSerializer

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Erro ao atualizar apreensão: {str(e)}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"])
    def destinar_incineracao(self, request, pk=None):
        apreensao = self.get_object()

        if not apreensao.arquivo_pdf:
            return Response(
                {"error": "Arquivo PDF nao encontrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Loteamento GLOBAL CONTINUO (numeracao nunca reseta, independente do ano)
        agora = timezone.now()
        ultimo_lote = LoteIncineracao.objects.order_by("-numero").first()

        if not ultimo_lote or ultimo_lote.apreensoes.count() >= 20:
            novo_numero = (ultimo_lote.numero + 1) if ultimo_lote else 1
            # Protocolo: 1CART6BPM-000001.2026 (numero global continuo, ano do momento)
            protocolo = f"1CART6BPM-{str(novo_numero).zfill(6)}.{agora.year}"
            ultimo_lote = LoteIncineracao.objects.create(
                numero=novo_numero, ano=agora.year, protocolo=protocolo
            )

        apreensao.lote_incineracao = ultimo_lote
        apreensao.status = "incineracao"
        apreensao.save()

        return Response(ApreensaoSerializer(apreensao).data)
