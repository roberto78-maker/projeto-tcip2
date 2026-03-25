import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import filters
from django_filters import rest_framework as django_filters
from django.utils import timezone
from .models import Apreensao, LoteIncineracao
from .serializers import ApreensaoSerializer, LoteIncineracaoSerializer

logger = logging.getLogger(__name__)


class LoteIncineracaoFilter(django_filters.FilterSet):
    ano = django_filters.NumberFilter(field_name="ano")
    protocolo = django_filters.CharFilter(
        field_name="protocolo", lookup_expr="icontains"
    )
    data_inicio = django_filters.DateTimeFilter(
        field_name="data_criacao", lookup_expr="gte"
    )
    data_fim = django_filters.DateTimeFilter(
        field_name="data_criacao", lookup_expr="lte"
    )

    class Meta:
        model = LoteIncineracao
        fields = ["ano", "protocolo", "origem"]


class LoteIncineracaoViewSet(viewsets.ModelViewSet):
    queryset = LoteIncineracao.objects.all().order_by("-data_criacao")
    serializer_class = LoteIncineracaoSerializer
    filterset_class = LoteIncineracaoFilter
    search_fields = ["protocolo", "origem"]
    ordering_fields = ["numero", "ano", "data_criacao"]
    ordering = ["-data_criacao"]


class ApreensaoFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    substancia = django_filters.CharFilter(
        field_name="substancia", lookup_expr="icontains"
    )
    reu = django_filters.CharFilter(field_name="reu", lookup_expr="icontains")
    bou = django_filters.CharFilter(field_name="bou", lookup_expr="icontains")
    processo = django_filters.CharFilter(field_name="processo", lookup_expr="icontains")
    data_inicio = django_filters.DateTimeFilter(
        field_name="data_criacao", lookup_expr="gte"
    )
    data_fim = django_filters.DateTimeFilter(
        field_name="data_criacao", lookup_expr="lte"
    )

    class Meta:
        model = Apreensao
        fields = ["status", "substancia", "reu", "bou", "processo"]


class ApreensaoViewSet(viewsets.ModelViewSet):
    queryset = (
        Apreensao.objects.select_related("lote_incineracao")
        .prefetch_related("historico")
        .order_by("-data_criacao")
    )
    serializer_class = ApreensaoSerializer
    filterset_class = ApreensaoFilter
    search_fields = ["processo", "bou", "reu", "substancia", "vara", "policial"]
    ordering_fields = ["data_criacao", "peso", "status"]
    ordering = ["-data_criacao"]
    filter_backends = [
        django_filters.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

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

        agora = timezone.now()
        ultimo_lote = LoteIncineracao.objects.order_by("-numero").first()

        if not ultimo_lote or ultimo_lote.apreensoes.count() >= 20:
            novo_numero = (ultimo_lote.numero + 1) if ultimo_lote else 1
            protocolo = f"1CART6BPM-{str(novo_numero).zfill(6)}.{agora.year}"
            ultimo_lote = LoteIncineracao.objects.create(
                numero=novo_numero, ano=agora.year, protocolo=protocolo
            )

        apreensao.lote_incineracao = ultimo_lote
        apreensao.status = "incineracao"
        apreensao.save()

        logger.info(
            f"Apreensão {apreensao.id} destinada para incineração no lote {ultimo_lote.protocolo}"
        )

        return Response(ApreensaoSerializer(apreensao).data)
