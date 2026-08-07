import io
import logging
import os
import random
import string
import traceback
import uuid as uuid_module
from collections import defaultdict
from datetime import timedelta

import cloudinary.uploader
from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Case, Count, F, FloatField, Q, Sum, When
from django.http import HttpResponse
from django.utils import timezone
from django.utils.html import escape
from django.utils.text import get_valid_filename
from django_filters import rest_framework as django_filters
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Apreensao, DiarioServico, Historico, LoteIncineracao, OficioPersonalizado, Policial
from .serializers import (
    ApreensaoSerializer,
    DiarioServicoSerializer,
    LoteIncineracaoSerializer,
    OficioPersonalizadoSerializer,
    PolicialSerializer,
)


class HealthCheckView(APIView):
    """
    Public endpoint to keep the server alive and check health.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {"status": "healthy", "timestamp": timezone.now()},
            status=status.HTTP_200_OK,
        )


logger = logging.getLogger(__name__)


def upload_documento(arquivo, *, public_id, folder, request=None):
    """
    Uploads to Cloudinary when configured; otherwise stores locally using the
    project's default storage and returns a browser-accessible URL.
    """
    if getattr(settings, "USE_CLOUDINARY", False):
        upload_result = cloudinary.uploader.upload(
            arquivo,
            resource_type="auto",
            folder=folder,
            public_id=public_id,
            overwrite=True,
        )
        return upload_result.get("secure_url")

    original_name = getattr(arquivo, "name", "documento.bin")
    name_part, ext_part = os.path.splitext(original_name)
    safe_name = get_valid_filename(name_part)
    safe_ext = get_valid_filename(ext_part.lstrip(".")).lower()
    filename = f"{safe_name}.{safe_ext}" if safe_ext else safe_name

    safe_public_id = get_valid_filename(str(public_id))
    storage_path = f"{folder}/{safe_public_id}_{filename}"
    saved_path = default_storage.save(storage_path, arquivo).replace("\\", "/")
    relative_url = default_storage.url(saved_path)

    if request is not None:
        return request.build_absolute_uri(relative_url)

    media_base = getattr(settings, "MEDIA_URL", "/media/")
    return f"{media_base.rstrip('/')}/{saved_path.lstrip('/')}"


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Returns all aggregated stats needed by the Dashboard in a single query.
        Replaces the previous pattern of downloading all records and filtering
        on the frontend.
        """
        peso_expressao = Case(
            When(unidade__iexact="kg", then=F("peso") * 1000.0),
            When(unidade__iexact="mg", then=F("peso") / 1000.0),
            default=F("peso"),
            output_field=FloatField(),
        )

        filtro_armas = (
            Q(substancia__icontains="faca")
            | Q(substancia__icontains="facão")
            | Q(substancia__icontains="simulacro")
            | Q(substancia__icontains="arma")
            | Q(substancia__icontains="pistola")
            | Q(substancia__icontains="revólver")
            | Q(substancia__icontains="garrucha")
            | Q(substancia__icontains="espingarda")
            | Q(substancia__icontains="canivete")
            | Q(substancia__icontains="punhal")
        )

        stats = Apreensao.objects.aggregate(
            total=Count("id"),
            count_conferencia=Count("id", filter=Q(status="conferencia")),
            count_cofre=Count("id", filter=Q(status="cofre", natureza="DROGAS")),
            count_incineracao=Count(
                "id", filter=Q(status="incineracao", natureza="DROGAS")
            ),
            count_queima_pronta=Count(
                "id", filter=Q(status="queima_pronta", natureza="DROGAS")
            ),
            count_excluido=Count("id", filter=Q(status="excluido")),
            peso_cofre=Sum(peso_expressao, filter=Q(status="cofre", natureza="DROGAS")),
            peso_incineracao=Sum(
                peso_expressao, filter=Q(status="incineracao", natureza="DROGAS")
            ),
            peso_queima_pronta=Sum(
                peso_expressao, filter=Q(status="queima_pronta", natureza="DROGAS")
            ),
            count_som=Count("id", filter=Q(natureza="SOM")),
            count_som_cofre=Count("id", filter=Q(natureza="SOM", status="cofre")),
            unid_som_cofre=Sum("peso", filter=Q(natureza="SOM", status="cofre")),
            count_outros=Count("id", filter=Q(natureza="OUTROS") & ~filtro_armas),
            count_outros_cofre=Count(
                "id", filter=Q(natureza="OUTROS", status="cofre") & ~filtro_armas
            ),
            unid_outros_cofre=Sum(
                "peso", filter=Q(natureza="OUTROS", status="cofre") & ~filtro_armas
            ),
            count_facas=Count("id", filter=filtro_armas),
            count_facas_cofre=Count("id", filter=filtro_armas & Q(status="cofre")),
            unid_facas_cofre=Sum("peso", filter=filtro_armas & Q(status="cofre")),
        )

        stats["peso_cofre"] = float(stats["peso_cofre"] or 0)
        stats["peso_incineracao"] = float(stats["peso_incineracao"] or 0)
        stats["peso_queima_pronta"] = float(stats["peso_queima_pronta"] or 0)
        stats["unid_som_cofre"] = int(stats["unid_som_cofre"] or 0)
        stats["unid_facas_cofre"] = int(stats["unid_facas_cofre"] or 0)
        stats["unid_outros_cofre"] = int(stats["unid_outros_cofre"] or 0)

        lotes_stats = LoteIncineracao.objects.aggregate(
            lotes_em_formacao=Count(
                "id",
                filter=Q(apreensoes__status="incineracao"),
                distinct=True,
            ),
            lotes_incinerados=Count(
                "id",
                filter=Q(apreensoes__status="queima_pronta"),
                distinct=True,
            ),
        )

        return Response({**stats, **lotes_stats})


class LoteIncineracaoFilter(django_filters.FilterSet):
    ano = django_filters.CharFilter(field_name="ano")
    protocolo = django_filters.CharFilter(
        field_name="protocolo", lookup_expr="icontains"
    )
    data_inicio = django_filters.DateFilter(
        field_name="data_criacao", lookup_expr="gte"
    )
    data_fim = django_filters.DateFilter(field_name="data_criacao", lookup_expr="lte")

    class Meta:
        model = LoteIncineracao
        fields = ["ano", "protocolo", "origem"]


class LoteIncineracaoViewSet(viewsets.ModelViewSet):
    queryset = LoteIncineracao.objects.all().order_by("-data_criacao")
    serializer_class = LoteIncineracaoSerializer
    pagination_class = None
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
    excluir_processo = django_filters.CharFilter(method="filter_excluir_processo")
    triagem_aba = django_filters.CharFilter(method="filter_triagem_aba")
    data_inicio = django_filters.DateFilter(field_name="data_fato", lookup_expr="gte")
    data_fim = django_filters.DateFilter(field_name="data_fato", lookup_expr="lte")
    natureza = django_filters.CharFilter(field_name="natureza")
    excluir_natureza = django_filters.CharFilter(method="filter_excluir_natureza")
    tem_apreensao = django_filters.BooleanFilter(field_name="tem_apreensao")

    def filter_excluir_natureza(self, queryset, name, value):
        """Excludes records whose natureza matches `value`."""
        if value:
            return queryset.exclude(natureza=value)
        return queryset

    def filter_excluir_processo(self, queryset, name, value):
        """Excludes records whose processo contains `value`."""
        if value:
            return queryset.exclude(processo__icontains=value)
        return queryset

    def filter_triagem_aba(self, queryset, name, value):
        """Filters by active tab on triagem (correct processes vs errors)."""
        if value == "PENDENCIAS":
            return queryset.filter(
                Q(processo__icontains="(ERRO - DATA DE AUDIENCIA)")
                | Q(vara__icontains="OUTROS JUIZADOS - ERRO MATERIAL")
            )
        elif value == "CORRETOS":
            return queryset.exclude(
                Q(processo__icontains="(ERRO - DATA DE AUDIENCIA)")
                | Q(vara__icontains="OUTROS JUIZADOS - ERRO MATERIAL")
            )
        return queryset

    class Meta:
        model = Apreensao
        fields = [
            "status",
            "substancia",
            "reu",
            "bou",
            "processo",
            "excluir_processo",
            "triagem_aba",
            "natureza",
            "excluir_natureza",
            "tem_apreensao",
        ]


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class ApreensaoViewSet(viewsets.ModelViewSet):
    pagination_class = StandardResultsSetPagination

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

    def perform_create(self, serializer):
        instance = serializer.save()
        Historico.objects.create(
            apreensao=instance,
            usuario=self.request.user if self.request.user.is_authenticated else None,
            acao="Criou a apreensão",
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        Historico.objects.create(
            apreensao=instance,
            usuario=self.request.user if self.request.user.is_authenticated else None,
            acao="Alterou dados da apreensão",
        )

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except APIException:
            raise
        except Exception as e:
            tb = traceback.format_exc()
            logger.error(f"ERRO CR\u00cdTICO ao criar apreens\u00e3o: {str(e)}\n{tb}")
            return Response(
                {"error": str(e), "traceback": tb if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except APIException:
            raise
        except Exception as e:
            logger.error(f"Erro ao atualizar apreens\u00e3o: {str(e)}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"])
    def destinar_incineracao(self, request, pk=None):
        apreensao = self.get_object()

        if apreensao.natureza != "DROGAS":
            return Response(
                {
                    "error": (
                        "Somente entorpecentes podem ser destinados \u00e0 incinera\u00e7\u00e3o."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (apreensao.arquivo_pdf_url or apreensao.arquivo_pdf):
            return Response(
                {
                    "error": (
                        "Arquivo PDF nao encontrado (Laudo/Certid\u00e3o obrigat\u00f3rio)."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        agora = timezone.now()

        with transaction.atomic():
            # Bloqueia todos os lotes ativos para evitar race conditions na contagem/criação.
            # Evita o uso de .distinct() direto com .select_for_update(), que não é suportado pelo PostgreSQL.
            lotes_ativos_ids = (
                Apreensao.objects.filter(status="incineracao")
                .exclude(lote_incineracao__isnull=True)
                .values_list("lote_incineracao_id", flat=True)
                .distinct()
            )
            lotes_candidatos = list(
                LoteIncineracao.objects.filter(
                    id__in=lotes_ativos_ids
                ).select_for_update()
            )

            # Procura em memória o primeiro lote com menos de 20 itens
            lote_aberto = None
            for lote in lotes_candidatos:
                if lote.apreensoes.filter(status="incineracao").count() < 20:
                    lote_aberto = lote
                    break

            if lote_aberto:
                ultimo_lote = lote_aberto
            else:
                # Bloqueia o último lote para garantir a numeração sequencial
                ultimo_referencia = (
                    LoteIncineracao.objects.select_for_update()
                    .order_by("-numero")
                    .first()
                )
                novo_numero = (ultimo_referencia.numero + 1) if ultimo_referencia else 1
                protocolo = f"1CART6BPM-{str(novo_numero).zfill(6)}.{agora.year}"
                ultimo_lote = LoteIncineracao.objects.create(
                    numero=novo_numero, ano=agora.year, protocolo=protocolo
                )

            apreensao.lote_incineracao = ultimo_lote
            apreensao.status = "incineracao"
            apreensao.save()

            Historico.objects.create(
                apreensao=apreensao,
                usuario=request.user if request.user.is_authenticated else None,
                acao=f"Destinou para incineração (Lote {ultimo_lote.protocolo})",
            )

        logger.info(
            f"Apreens\u00e3o {apreensao.id} destinada para incinera\u00e7\u00e3o no lote {ultimo_lote.protocolo}"
        )

        return Response(ApreensaoSerializer(apreensao).data)

    @action(detail=False, methods=["post"])
    def finalizar_lote(self, request):
        """
        Finaliza lote: recebe lote_id e altera status das apreensoes para
        'queima_pronta'. Pode receber um arquivo_pdf (PDF ou Imagem) para
        anexar a todos os itens do lote. Limite de arquivo: 2MB.
        """
        lote_id = request.data.get("lote_id")
        arquivo = request.FILES.get("arquivo_pdf")

        if not lote_id:
            return Response(
                {"error": "lote_id \u00e9 obrigat\u00f3rio"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lote = LoteIncineracao.objects.get(id=lote_id)
        except LoteIncineracao.DoesNotExist:
            return Response(
                {"error": "Lote n\u00e3o encontrado"}, status=status.HTTP_404_NOT_FOUND
            )

        if arquivo and arquivo.size > 2 * 1024 * 1024:
            return Response(
                {"error": "O arquivo \u00e9 muito grande. Limite m\u00e1ximo: 2MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        apreensoes = Apreensao.objects.filter(
            lote_incineracao=lote, status="incineracao"
        )

        if apreensoes.count() == 0:
            return Response(
                {"error": "Lote n\u00e3o possui itens para finalizar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            url_cloudinary = None

            if arquivo:
                logger.info(
                    f"Iniciando upload \u00fanico ao Cloudinary para o lote {lote.protocolo}..."
                )
                arquivo.seek(0)
                url_cloudinary = upload_documento(
                    arquivo,
                    folder="laudos_pdf",
                    public_id=f"lote_{lote.protocolo.replace('.', '_')}",
                    request=request,
                )
                logger.info(f"Upload conclu\u00eddo. URL: {url_cloudinary}")

            lista_apreensoes = list(apreensoes)
            for apreensao in lista_apreensoes:
                apreensao.status = "queima_pronta"
                if url_cloudinary:
                    apreensao.arquivo_pdf_url = url_cloudinary

            campos_atualizar = ["status"]
            if url_cloudinary:
                campos_atualizar.append("arquivo_pdf_url")

            Apreensao.objects.bulk_update(lista_apreensoes, campos_atualizar)
            count = len(lista_apreensoes)

            for apreensao in lista_apreensoes:
                Historico.objects.create(
                    apreensao=apreensao,
                    usuario=request.user if request.user.is_authenticated else None,
                    acao=f"Finalizou incineração (Lote {lote.protocolo})",
                )

            logger.info(
                f"Lote {lote.protocolo} finalizado com {count} registros. URL doc: {url_cloudinary or 'Nenhum'}"
            )

            return Response(
                {
                    "message": (
                        f"Incinera\u00e7\u00e3o Lote {lote.protocolo} conclu\u00edda com sucesso."
                    ),
                    "itens_finalizados": count,
                    "documento_anexado": bool(url_cloudinary),
                    "url_documento": url_cloudinary,
                }
            )
        except Exception as e:
            logger.error(f"ERRO CR\u00cdTICO ao finalizar lote {lote_id}: {str(e)}")
            return Response(
                {"error": f"Erro interno ao finalizar lote: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def excluir(self, request, pk=None):
        apreensao = self.get_object()
        motivo = request.data.get("motivo")

        if not motivo:
            return Response(
                {"error": "Motivo da exclus\u00e3o \u00e9 obrigat\u00f3rio"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        apreensao.status = "excluido"
        apreensao.motivo_exclusao = motivo
        apreensao.save()

        Historico.objects.create(
            apreensao=apreensao,
            usuario=request.user if request.user.is_authenticated else None,
            acao=f"Excluiu apreensão. Motivo: {motivo}",
        )

        logger.info(f"Apreens\u00e3o {apreensao.id} exclu\u00edda. Motivo: {motivo}")

        return Response(ApreensaoSerializer(apreensao).data)

    @action(detail=False, methods=["post"])
    def gerar_numero_recibo(self, request):
        """
        Gera um número sequencial único de recibo para o ano atual.
        Recebe o BOU no body e atribui o mesmo número a todos os registros
        com o mesmo BOU (pois um recibo pode conter múltiplos materiais).
        Se os registros do BOU já possuem número, retorna o existente.
        Opera dentro de transaction.atomic + select_for_update para evitar
        race conditions em cadastros simultâneos.
        """
        bou = request.data.get("bou")
        if not bou:
            return Response(
                {"error": "BOU é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ano_atual = timezone.now().year

        with transaction.atomic():
            # Verifica se já existe um recibo para esse BOU no ano atual
            existente = Apreensao.objects.filter(
                bou=bou, ano_recibo=ano_atual, numero_recibo__isnull=False
            ).first()

            if existente:
                Apreensao.objects.filter(bou=bou, numero_recibo__isnull=True).update(
                    numero_recibo=existente.numero_recibo,
                    ano_recibo=existente.ano_recibo,
                )
                return Response(
                    {
                        "numero_recibo": existente.numero_recibo,
                        "ano_recibo": existente.ano_recibo,
                    }
                )

            # Bloqueia a linha com o maior número para garantir consistência e evitar race conditions
            ultimo_registro = (
                Apreensao.objects.filter(
                    ano_recibo=ano_atual, numero_recibo__isnull=False
                )
                .select_for_update()
                .order_by("-numero_recibo")
                .first()
            )
            ultimo_recibo = ultimo_registro.numero_recibo if ultimo_registro else 0

            novo_numero = (ultimo_recibo + 1) if ultimo_recibo else 1

            # .update() retorna a contagem de linhas afetadas
            count = Apreensao.objects.filter(
                bou=bou, numero_recibo__isnull=True
            ).update(numero_recibo=novo_numero, ano_recibo=ano_atual)

        logger.info(
            f"Recibo #{novo_numero}/{ano_atual} gerado para BOU {bou} ({count} registros)"
        )

        return Response(
            {
                "numero_recibo": novo_numero,
                "ano_recibo": ano_atual,
            }
        )

    @action(detail=True, methods=["post"])
    def upload_pdf(self, request, pk=None):
        """
        Uploads a PDF/image to Cloudinary for an individual Apreensao record.
        Stores the resulting secure_url in arquivo_pdf_url (plain URL string).
        Never writes to the deprecated arquivo_pdf FileField.
        """
        apreensao = self.get_object()
        arquivo = request.FILES.get("arquivo_pdf")

        if not arquivo:
            return Response(
                {"error": "Nenhum arquivo enviado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if arquivo.size > 5 * 1024 * 1024:
            return Response(
                {"error": "Arquivo muito grande. Limite: 5MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            safe_bou = apreensao.bou.replace("/", "_").replace(" ", "_")
            public_id = f"{apreensao.id}_{safe_bou}"
            url = upload_documento(
                arquivo,
                folder="laudos_pdf",
                public_id=public_id,
                request=request,
            )

            apreensao.arquivo_pdf_url = url
            apreensao.save(update_fields=["arquivo_pdf_url"])

            logger.info(f"PDF carregado para Apreens\u00e3o {apreensao.id}: {url}")
            return Response(
                {"arquivo_pdf_url": url, "message": "PDF carregado com sucesso."}
            )
        except Exception as e:
            logger.error(
                f"Erro no upload do PDF para apreens\u00e3o {apreensao.id}: {e}"
            )
            return Response(
                {"error": f"Falha no upload: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def remover_pdf(self, request, pk=None):
        """
        Removes the attached PDF by clearing the arquivo_pdf_url field.
        """
        apreensao = self.get_object()

        if not apreensao.arquivo_pdf_url and not apreensao.arquivo_pdf:
            return Response(
                {"error": "Nenhum PDF anexado para remover."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        apreensao.arquivo_pdf_url = None
        if apreensao.arquivo_pdf:
            apreensao.arquivo_pdf.delete(save=False)

        apreensao.save(update_fields=["arquivo_pdf_url", "arquivo_pdf"])

        Historico.objects.create(
            apreensao=apreensao,
            usuario=request.user if request.user.is_authenticated else None,
            acao="Removeu o PDF anexado",
        )

        logger.info(f"PDF removido para Apreensão {apreensao.id}")
        return Response({"message": "PDF removido com sucesso."})

    @action(detail=True, methods=["post"])
    def gerar_numero_oficio(self, request, pk=None):
        """
        Gera um número sequencial único de ofício para o ano atual.
        Se a apreensão já tiver um número, retorna o mesmo.
        Opera dentro de transaction.atomic + select_for_update para evitar
        race conditions em emissões simultâneas.
        """
        ano_atual = timezone.now().year

        with transaction.atomic():
            # Bloqueia a linha da apreensão para escrita exclusiva
            apreensao = Apreensao.objects.select_for_update().get(pk=pk)

            # Re-verifica dentro da transação (double-check)
            if apreensao.numero_oficio and apreensao.ano_oficio == ano_atual:
                return Response(ApreensaoSerializer(apreensao).data)

            # Bloqueia e busca o maior número do ano
            ultimo_reg_apreensao = (
                Apreensao.objects.filter(
                    ano_oficio=ano_atual, numero_oficio__isnull=False
                )
                .select_for_update()
                .order_by("-numero_oficio")
                .first()
            )
            ultimo_oficio_apreensao = (
                ultimo_reg_apreensao.numero_oficio if ultimo_reg_apreensao else 0
            )

            ultimo_reg_personalizado = (
                OficioPersonalizado.objects.filter(
                    ano_oficio=ano_atual, numero_oficio__isnull=False
                )
                .select_for_update()
                .order_by("-numero_oficio")
                .first()
            )
            ultimo_oficio_personalizado = (
                ultimo_reg_personalizado.numero_oficio
                if ultimo_reg_personalizado
                else 0
            )

            ultimo_oficio = max(ultimo_oficio_apreensao, ultimo_oficio_personalizado)
            novo_numero = (ultimo_oficio + 1) if ultimo_oficio > 0 else 100

            apreensao.numero_oficio = novo_numero
            apreensao.ano_oficio = ano_atual
            apreensao.save(update_fields=["numero_oficio", "ano_oficio"])

        Historico.objects.create(
            apreensao=apreensao,
            usuario=request.user if request.user.is_authenticated else None,
            acao=f"Gerou número de ofício: {str(novo_numero).zfill(3)}/{ano_atual}",
        )

        return Response(ApreensaoSerializer(apreensao).data)


def _aplicar_filtros_relatorio(qs, params):
    """
    Aplica os filtros comuns às views de relatório (JSON e PDF).
    Recebe um queryset base e um dict-like de parâmetros GET.
    Retorna o queryset filtrado sem alterar a lógica de negócio.
    """
    data_inicio = params.get("data_inicio")
    data_fim = params.get("data_fim")
    vara = params.get("vara")
    substancia = params.get("substancia")
    natureza = params.get("natureza")
    status_f = params.get("status")
    bou = params.get("bou")
    processo = params.get("processo")
    reu = params.get("reu")
    crime = params.get("crime")

    if data_inicio:
        qs = qs.filter(data_fato__date__gte=data_inicio)
    if data_fim:
        qs = qs.filter(data_fato__date__lte=data_fim)
    if vara:
        qs = qs.filter(
            Q(vara__icontains=vara)
            | Q(vara__icontains=vara.replace("JUIZADO", "VARA").replace("º", "ª"))
            | Q(vara__icontains=vara.replace("VARA", "JUIZADO").replace("ª", "º"))
        )
    if substancia == "__NENHUMA__":
        qs = qs.exclude(natureza="DROGAS")
    elif substancia:
        qs = qs.filter(
            Q(substancia__icontains=substancia) | Q(descricao__icontains=substancia)
        )
    if natureza:
        if natureza == "AMEACA":
            qs = qs.filter(
                Q(natureza="AMEACA") | Q(substancia__icontains="NÃO HÁ APREENSÃO")
            )
        else:
            qs = qs.filter(natureza=natureza)
    if status_f:
        qs = qs.filter(status=status_f)
    if bou:
        qs = qs.filter(bou__icontains=bou)
    if processo:
        qs = qs.filter(processo__icontains=processo)
    if reu:
        qs = qs.filter(reu__icontains=reu)
    if crime:
        qs = qs.filter(descricao__icontains=crime)
    return qs


class RelatorioIncineracaoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = _aplicar_filtros_relatorio(Apreensao.objects.all(), request.GET)

        try:
            detalhado = list(
                qs.values(
                    "id",
                    "bou",
                    "natureza",
                    "substancia",
                    "peso",
                    "unidade",
                    "vara",
                    "data_fato",
                    "data_criacao",
                    "status",
                    "processo",
                    "reu",
                    "motivo_exclusao",
                    "lote_incineracao__numero",
                    "lote_incineracao__data_criacao",
                    "arquivo_pdf_url",
                ).order_by("-data_fato", "-data_criacao")[:500]
            )
        except Exception as e:
            logger.error(f"Erro ao consultar radar: {str(e)}")
            return Response(
                {"error": "Erro ao processar busca no radar. Verifique os filtros."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        status_labels = {
            "conferencia": "Aguardando Conferência",
            "cofre": "No Cofre",
            "incineracao": "Lotes (P. Queima)",
            "queima_pronta": "Incinerado",
            "excluido": "Excluído / Cancelado",
            "arquivado": "arquivado",
        }

        detalhado_formatado = []
        for item in detalhado:
            status_desc = status_labels.get(item["status"], item["status"])

            if item.get("lote_incineracao__numero"):
                lote_num = str(item["lote_incineracao__numero"]).zfill(2)
                lote_dt = item.get("lote_incineracao__data_criacao")
                lote_data = (
                    timezone.localtime(lote_dt).strftime("%d/%m/%y")
                    if lote_dt
                    else "S/D"
                )
                status_desc = f"{status_desc} (Lote {lote_num} - {lote_data})"

            # Fallback para data: usa data_fato, se nulo usa data_criacao
            data_exibicao = item.get("data_fato") or item.get("data_criacao")

            detalhado_formatado.append(
                {
                    "id": item["id"],
                    "bou": item["bou"],
                    "processo": item["processo"],
                    "reu": item["reu"],
                    "substancia": item["substancia"],
                    "peso": item["peso"],
                    "unidade": item["unidade"],
                    "natureza": item["natureza"],
                    "vara": item["vara"],
                    "status_label": status_desc,
                    "motivo_exclusao": item["motivo_exclusao"],
                    "arquivo_pdf_url": item["arquivo_pdf_url"],
                    "data": (
                        timezone.localtime(data_exibicao).strftime("%Y-%m-%d")
                        if data_exibicao
                        else None
                    ),
                }
            )

        return Response({"detalhado": detalhado_formatado})


class RelatorioIncineracaoPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs_base = _aplicar_filtros_relatorio(Apreensao.objects.all(), request.GET)

        peso_expressao = Case(
            When(unidade__iexact="kg", then=F("peso") * 1000.0),
            When(unidade__iexact="mg", then=F("peso") / 1000.0),
            default=F("peso"),
            output_field=FloatField(),
        )

        # Agrega estatísticas antes de fatiar para evitar múltiplos selects e loops Python
        stats = qs_base.aggregate(
            total_itens=Count("id"),
            processos_unicos=Count("processo", distinct=True),
            reus_unicos=Count("reu", distinct=True),
            peso_total=Sum(
                peso_expressao, filter=Q(natureza="DROGAS") & ~Q(unidade="Unid")
            ),
            count_som=Count("id", filter=Q(natureza="SOM")),
            count_facas=Count(
                "id",
                filter=(
                    Q(substancia__icontains="faca") | Q(substancia__icontains="facão")
                ),
            ),
        )

        total_itens = stats["total_itens"]
        processos_unicos = stats["processos_unicos"]
        reus_unicos = stats["reus_unicos"]
        peso_total = float(stats["peso_total"] or 0)
        count_som = stats["count_som"]
        count_facas = stats["count_facas"]

        qs = qs_base.select_related("lote_incineracao").order_by("data_criacao")[:1000]

        data_inicio = request.GET.get("data_inicio")
        data_fim = request.GET.get("data_fim")
        vara = request.GET.get("vara")
        substancia = request.GET.get("substancia")
        natureza = request.GET.get("natureza")
        status_filter = request.GET.get("status")
        bou = request.GET.get("bou")
        processo = request.GET.get("processo")
        reu = request.GET.get("reu")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=18,
        )
        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "TitleCenter",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=11,
            alignment=1,
            spaceAfter=5,
        )
        subtitle_title_style = ParagraphStyle(
            "TitleCenterSub",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            alignment=1,
            spaceAfter=15,
        )

        normal_style = styles["Normal"]
        subtitle_style = ParagraphStyle(
            "SubTitle",
            parent=styles["Heading2"],
            spaceAfter=10,
            spaceBefore=20,
            textColor=colors.HexColor("#1e3a8a"),
        )

        elements.append(
            Paragraph("POL\u00cdCIA MILITAR DO PARAN\u00c1 - 6\u00ba BPM", title_style)
        )
        elements.append(
            Paragraph("PRIMEIRO CART\u00d3RIO - CASCAVEL", subtitle_title_style)
        )

        elements.append(
            Paragraph(
                "RELAT\u00d3RIO DE AUDITORIA E RASTREIO",
                ParagraphStyle(
                    "DocTitle",
                    parent=styles["Heading2"],
                    fontName="Helvetica-Bold",
                    fontSize=12,
                    alignment=1,
                    spaceAfter=10,
                ),
            )
        )

        periodo_texto = (
            f"Per\u00edodo: {data_inicio or 'In\u00edcio'} a {data_fim or 'Hoje'}"
        )
        filtros_usados = []
        if vara:
            filtros_usados.append(f"Juizado: {escape(vara)}")
        if substancia:
            filtros_usados.append(f"Subst\u00e2ncia: {escape(substancia)}")
        if natureza:
            filtros_usados.append(f"Natureza: {escape(natureza)}")
        if status_filter:
            filtros_usados.append(f"Status: {escape(status_filter)}")
        if bou:
            filtros_usados.append(f"BOU: {escape(bou)}")
        if processo:
            filtros_usados.append(f"Processo: {escape(processo)}")
        if reu:
            filtros_usados.append(f"R\u00e9u/Autor: {escape(reu)}")

        filtros_str = " | ".join(filtros_usados) if filtros_usados else "Nenhum"

        info = f"<b>{periodo_texto}</b><br/><b>Filtros Aplicados:</b> {filtros_str}"
        elements.append(Paragraph(info, normal_style))
        elements.append(Spacer(1, 10))

        resumo_data = [
            [Paragraph("<b>RESUMO ESTAT\u00cdSTICO</b>", title_style)],
            [f"Total de Processos: {str(processos_unicos).zfill(2)}"],
            [f"Pessoas Identificadas: {str(reus_unicos).zfill(2)}"],
            [f"Total de Itens: {str(total_itens).zfill(2)}"],
        ]

        if peso_total > 0:
            resumo_data.append(
                [f"Peso Estimado (Drogas): {peso_total:.2f}g".replace(".", ",")]
            )

        if count_som > 0 or count_facas > 0:
            objetos_str = []
            if count_som > 0:
                objetos_str.append(f"{count_som} Aparelhos de Som")
            if count_facas > 0:
                objetos_str.append(f"{count_facas} Armas Brancas (Facas)")
            resumo_data.append([f"Objetos: {' | '.join(objetos_str)}"])

        resumo_tab = Table(resumo_data, colWidths=[6 * inch])
        resumo_tab.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
                ]
            )
        )
        elements.append(resumo_tab)
        elements.append(Spacer(1, 20))

        meses = {
            1: "Janeiro",
            2: "Fevereiro",
            3: "Mar\u00e7o",
            4: "Abril",
            5: "Maio",
            6: "Junho",
            7: "Julho",
            8: "Agosto",
            9: "Setembro",
            10: "Outubro",
            11: "Novembro",
            12: "Dezembro",
        }

        agrupado = defaultdict(list)
        for item in qs:
            # Prioriza data_fato para o agrupamento mensal
            dt_ref = item.data_fato or item.data_criacao
            if dt_ref:
                mes_ano = f"{meses[dt_ref.month]} de {dt_ref.year}"
            else:
                mes_ano = "Data Desconhecida"
            agrupado[mes_ano].append(item)

        status_labels = {
            "conferencia": "Aguardando Confer\u00eancia",
            "cofre": "No Cofre",
            "incineracao": "Lotes",
            "queima_pronta": "Incinerado",
            "excluido": "Exclu\u00eddo",
        }

        if not agrupado:
            elements.append(
                Paragraph(
                    "Nenhum registro encontrado para os filtros selecionados.",
                    normal_style,
                )
            )
        else:
            for mes_ano, itens in agrupado.items():
                elements.append(Paragraph(mes_ano, subtitle_style))

                data = [
                    [
                        "BOU/Processo",
                        "Subst\u00e2ncia",
                        "Volume/Peso",
                        "Local (Status)",
                        "Data",
                    ]
                ]
                for item in itens:
                    linha1 = item.bou or "-"
                    if item.processo:
                        linha1 += f"\nProc: {item.processo}"

                    status_desc = status_labels.get(item.status, item.status)
                    if hasattr(item, "lote_incineracao") and item.lote_incineracao:
                        lote_num = str(item.lote_incineracao.numero).zfill(2)
                        lote_data = (
                            timezone.localtime(
                                item.lote_incineracao.data_criacao
                            ).strftime("%d/%m/%y")
                            if item.lote_incineracao.data_criacao
                            else "S/D"
                        )
                        status_desc = f"{status_desc}\n(Lote {lote_num} - {lote_data})"

                    # Prioriza data_fato para a coluna Data do PDF
                    dt_exibicao = item.data_fato or item.data_criacao
                    data.append(
                        [
                            linha1,
                            item.substancia or "-",
                            f"{item.peso} {item.unidade}",
                            status_desc,
                            (
                                timezone.localtime(dt_exibicao).strftime("%d/%m/%Y")
                                if dt_exibicao
                                else "-"
                            ),
                        ]
                    )

                t = Table(
                    data,
                    colWidths=[
                        1.7 * inch,
                        1.2 * inch,
                        1.1 * inch,
                        1.6 * inch,
                        1.0 * inch,
                    ],
                )
                t.setStyle(
                    TableStyle(
                        [
                            (
                                "BACKGROUND",
                                (0, 0),
                                (-1, 0),
                                colors.HexColor("#dc2626"),
                            ),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, 0), 9),
                            ("FONTSIZE", (0, 1), (-1, -1), 8),
                            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                            ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ]
                    )
                )
                elements.append(t)
                elements.append(Spacer(1, 10))

        protocolo_hash = (
            "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
            + "-"
            + timezone.now().strftime("%H%M")
        )

        def add_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont("Helvetica-Oblique", 8)
            canvas.setStrokeColor(colors.grey)
            canvas.line(30, 45, 565, 45)

            usuario = request.user.username.upper() if request.user else "SISTEMA"
            data_hora = timezone.now().strftime("%d/%m/%Y %H:%M")
            footer_text = (
                f"Gerado por {usuario} em {data_hora} | Protocolo: AUD-{protocolo_hash}"
            )

            canvas.drawString(30, 33, footer_text)
            canvas.drawRightString(565, 33, f"P\u00e1gina {doc.page}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
        buffer.seek(0)

        response = HttpResponse(buffer, content_type="application/pdf")
        filename = f"relatorio_radar_{protocolo_hash}.pdf"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class UserProfileView(APIView):
    """
    Returns the authenticated user's profile information.
    Used by the frontend to display the operator's full name in documents
    (e.g. Ofício de Encaminhamento).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        full_name = user.get_full_name() or user.username
        return Response(
            {
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": full_name,
            }
        )


class FixVarasParaJuizadosView(APIView):
    """
    View administrativa para corrigir o campo 'vara' nos registros antigos,
    migrando de 'Xª VARA ESPECIAL CRIMINAL' para 'Xº JUIZADO ESPECIAL CRIMINAL'.
    Requer superuser. Pode ser executada com dry_run=true para preview.
    """

    permission_classes = [permissions.IsAdminUser]

    MAPA_VARAS = {
        "1ª VARA ESPECIAL CRIMINAL": "1º JUIZADO ESPECIAL CRIMINAL",
        "2ª VARA ESPECIAL CRIMINAL": "2º JUIZADO ESPECIAL CRIMINAL",
        "3ª VARA ESPECIAL CRIMINAL": "3º JUIZADO ESPECIAL CRIMINAL",
        "1a VARA ESPECIAL CRIMINAL": "1º JUIZADO ESPECIAL CRIMINAL",
        "2a VARA ESPECIAL CRIMINAL": "2º JUIZADO ESPECIAL CRIMINAL",
        "3a VARA ESPECIAL CRIMINAL": "3º JUIZADO ESPECIAL CRIMINAL",
        "1ª VARA CRIMINAL": "1º JUIZADO ESPECIAL CRIMINAL",
        "2ª VARA CRIMINAL": "2º JUIZADO ESPECIAL CRIMINAL",
        "3ª VARA CRIMINAL": "3º JUIZADO ESPECIAL CRIMINAL",
    }

    def post(self, request):
        if not request.user.is_superuser:
            return Response(
                {"error": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN
            )

        dry_run = request.data.get("dry_run", False)
        relatorio = []
        total_alterados = 0

        for vara_antiga, vara_nova in self.MAPA_VARAS.items():
            qs = Apreensao.objects.filter(vara__iexact=vara_antiga)
            count = qs.count()
            if count == 0:
                continue

            relatorio.append({"de": vara_antiga, "para": vara_nova, "registros": count})

            if not dry_run:
                qs.update(vara=vara_nova)
                total_alterados += count

        # Detecta variações não mapeadas
        nao_mapeados = (
            Apreensao.objects.filter(vara__icontains="VARA ESPECIAL")
            .exclude(vara__icontains="JUIZADO")
            .values_list("vara", flat=True)
            .distinct()[:20]
        )

        return Response(
            {
                "dry_run": dry_run,
                "alteracoes": relatorio,
                "total_alterados": total_alterados if not dry_run else None,
                "nao_mapeados_ainda": list(nao_mapeados),
                "mensagem": (
                    "[DRY-RUN] Nenhuma alteração foi salva."
                    if dry_run
                    else f"Migração concluída: {total_alterados} registro(s) atualizados."
                ),
            }
        )


# class ResetSystemView(APIView):
#     """
#     Temporary view to trigger the go_live command via API.
#     Required because Render Free Tier doesn't allow Shell access.
#     """
#
#     permission_classes = [permissions.IsAdminUser]
#
#     def post(self, request):
#         if not request.user.is_superuser:
#             return Response(
#                 {"error": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN
#             )
#
#         try:
#             # Executa o comando go_live com a flag --confirm
#             call_command("go_live", "--confirm")
#             return Response(
#                 {"message": "Sistema resetado com sucesso! Pronto para uso."}
#             )
#         except Exception as e:
#             return Response(
#                 {"error": f"Erro ao resetar: {str(e)}"},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             )


# ─── Assinatura Eletrônica via QR Code ────────────────────────────────────────


class GerarTokenAssinaturaView(APIView):
    """
    POST autenticado — chamado pelo PC do cartório ao clicar em
    "Coletar Assinatura". Gera um token UUID temporário (válido 30 min),
    salva em todos os registros do BOU informado e retorna a URL do QR Code
    que o celular deve acessar.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        bou = request.data.get("bou", "").strip()
        sem_token = request.data.get("sem_token_cartorario", False)
        if not bou:
            return Response(
                {"error": "BOU é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token = uuid_module.uuid4()
        expira_em = timezone.now() + timedelta(minutes=30)

        # Salva o token em todos os registros com esse BOU
        apreensoes = Apreensao.objects.filter(bou=bou)
        if not apreensoes.exists():
            # BOU ainda não salvo: vamos gerar token sem vincular a registros.
            # O frontend salva os registros apenas após a assinatura.
            logger.info(
                f"[Assinatura] Token gerado para BOU '{bou}' sem registros existentes (cadastro ainda não salvo)."
            )
        else:
            apreensoes.update(token_assinatura=token, token_expira_em=expira_em)

        # URL que o celular vai abrir ao escanear o QR Code
        frontend_base = os.environ.get(
            "FRONTEND_URL", "https://projeto-tcip2.vercel.app"
        )
        url_celular = f"{frontend_base}/assinar?token={token}&bou={bou}"
        if sem_token:
            url_celular += "&sem_token=true"

        logger.info(
            f"[Assinatura] Token {token} gerado para BOU '{bou}'. "
            f"Sem token cartorário: {sem_token}. Expira em: {expira_em}"
        )

        return Response(
            {
                "token": str(token),
                "url_qr": url_celular,
                "expira_em": expira_em.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class ReceberAssinaturaView(APIView):
    """
    POST público (sem JWT) — chamado pelo celular ao confirmar a assinatura.
    Valida o token, verifica expiração e salva o Base64 da assinatura
    em todos os registros do BOU correspondente.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get("token", "").strip()
        assinatura_b64 = request.data.get("assinatura_base64", "").strip()
        assinatura_cartorario_b64 = request.data.get(
            "assinatura_cartorario_base64", ""
        ).strip()
        bou = request.data.get("bou", "").strip()

        # Validações básicas
        if not token_str:
            return Response(
                {"error": "Token é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not assinatura_b64:
            return Response(
                {"error": "Assinatura do entregador não pode estar em branco."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not assinatura_b64.startswith("data:image/"):
            return Response(
                {"error": "Formato de assinatura inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if assinatura_cartorario_b64 and not assinatura_cartorario_b64.startswith(
            "data:image/"
        ):
            return Response(
                {"error": "Formato da assinatura do cartorário inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valida o UUID
        try:
            token = uuid_module.UUID(token_str)
        except ValueError:
            return Response(
                {"error": "Token inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        agora = timezone.now()

        # Guarda a assinatura temporariamente em cache por 30 minutos (1800s)
        cache_data = {
            "assinatura_base64": assinatura_b64,
            "assinatura_cartorario_base64": assinatura_cartorario_b64 or None,
            "tipo_assinatura_cartorario": (
                "MANUAL" if assinatura_cartorario_b64 else "TOKEN"
            ),
        }
        cache_key = f"assinatura_{token_str}"
        cache.set(cache_key, cache_data, timeout=1800)

        update_fields = {"assinatura_base64": assinatura_b64}
        if assinatura_cartorario_b64:
            update_fields["assinatura_cartorario_base64"] = assinatura_cartorario_b64
            update_fields["tipo_assinatura_cartorario"] = "MANUAL"

        if bou:
            # Tenta buscar registros já existentes com esse BOU e token correspondente
            apreensoes = Apreensao.objects.filter(bou=bou, token_assinatura=token)
            if apreensoes.exists():
                # Verifica expiração usando o primeiro registro
                primeiro = apreensoes.first()
                if primeiro.token_expira_em and primeiro.token_expira_em < agora:
                    return Response(
                        {"error": "Token expirado. Gere um novo QR Code."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                count = apreensoes.update(**update_fields)
                logger.info(
                    f"[Assinatura] Assinatura salva via BOU '{bou}' e token '{token}' em {count} registro(s)."
                )
                return Response({"ok": True, "registros": count})
            elif Apreensao.objects.filter(bou=bou).exists():
                return Response(
                    {"error": "Token não corresponde ao BOU informado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Fallback: busca pelo token UUID diretamente
        apreensoes_token = Apreensao.objects.filter(token_assinatura=token)
        if not apreensoes_token.exists():
            # Token ainda válido sem registros — salva uma entrada temporária
            logger.warning(
                f"[Assinatura] Token {token} recebido sem registros vinculados."
            )
            return Response({"ok": True, "registros": 0, "pendente": True})

        primeiro = apreensoes_token.first()
        if primeiro.token_expira_em and primeiro.token_expira_em < agora:
            return Response(
                {"error": "Token expirado. Gere um novo QR Code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        count = apreensoes_token.update(**update_fields)
        logger.info(
            f"[Assinatura] Assinatura salva via token {token} em {count} registro(s)."
        )
        return Response({"ok": True, "registros": count})


class StatusAssinaturaView(APIView):
    """
    GET público (sem JWT) — chamado pelo PC a cada 3 segundos (short polling)
    para verificar se a assinatura do celular já chegou.

    Parâmetros de query:
      ?token=<uuid>  — token de sessão do QR Code
      ?bou=<bou>     — BOU do cadastro (opcional, melhora a busca)
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token_str = request.query_params.get("token", "").strip()
        bou = request.query_params.get("bou", "").strip()

        if not token_str:
            return Response(
                {"error": "Token é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = uuid_module.UUID(token_str)
        except ValueError:
            return Response(
                {"error": "Token inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        agora = timezone.now()

        # 1. Verifica se a assinatura chegou e está no cache
        cache_key = f"assinatura_{token_str}"
        assinatura_cache = cache.get(cache_key)

        if assinatura_cache:
            if isinstance(assinatura_cache, dict):
                return Response(
                    {
                        "assinado": True,
                        "assinatura_base64": assinatura_cache.get("assinatura_base64"),
                        "assinatura_cartorario_base64": assinatura_cache.get(
                            "assinatura_cartorario_base64"
                        ),
                        "tipo_assinatura_cartorario": assinatura_cache.get(
                            "tipo_assinatura_cartorario", "TOKEN"
                        ),
                    }
                )
            else:
                return Response(
                    {
                        "assinado": True,
                        "assinatura_base64": assinatura_cache,
                        "assinatura_cartorario_base64": None,
                        "tipo_assinatura_cartorario": "TOKEN",
                    }
                )

        # 2. Busca por BOU (registros mais recentes) e token correspondente
        if bou:
            apreensao = (
                Apreensao.objects.filter(bou=bou, token_assinatura=token)
                .order_by("-data_criacao")
                .first()
            )
        else:
            apreensao = Apreensao.objects.filter(token_assinatura=token).first()

        if not apreensao:
            return Response(
                {
                    "assinado": False,
                    "assinatura_base64": None,
                    "assinatura_cartorario_base64": None,
                    "tipo_assinatura_cartorario": "TOKEN",
                }
            )

        # Verifica expiração
        if apreensao.token_expira_em and apreensao.token_expira_em < agora:
            return Response(
                {
                    "assinado": False,
                    "expirado": True,
                    "assinatura_base64": None,
                    "assinatura_cartorario_base64": None,
                    "tipo_assinatura_cartorario": "TOKEN",
                }
            )

        assinado = bool(apreensao.assinatura_base64)
        return Response(
            {
                "assinado": assinado,
                "assinatura_base64": apreensao.assinatura_base64 if assinado else None,
                "assinatura_cartorario_base64": (
                    apreensao.assinatura_cartorario_base64 if assinado else None
                ),
                "tipo_assinatura_cartorario": (
                    apreensao.tipo_assinatura_cartorario if assinado else "TOKEN"
                ),
            }
        )


class OficioPersonalizadoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = OficioPersonalizado.objects.all().order_by("-data_criacao")
    serializer_class = OficioPersonalizadoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["bou", "assunto", "texto", "orgao_destino", "numero_oficio"]
    pagination_class = StandardResultsSetPagination

    def create(self, request, *args, **kwargs):
        ano_atual = timezone.now().year

        with transaction.atomic():
            # Pegar o maior numero
            ultimo_reg_apreensao = (
                Apreensao.objects.filter(
                    ano_oficio=ano_atual, numero_oficio__isnull=False
                )
                .select_for_update()
                .order_by("-numero_oficio")
                .first()
            )
            ultimo_oficio_apreensao = (
                ultimo_reg_apreensao.numero_oficio if ultimo_reg_apreensao else 0
            )

            ultimo_reg_personalizado = (
                OficioPersonalizado.objects.filter(
                    ano_oficio=ano_atual, numero_oficio__isnull=False
                )
                .select_for_update()
                .order_by("-numero_oficio")
                .first()
            )
            ultimo_oficio_personalizado = (
                ultimo_reg_personalizado.numero_oficio
                if ultimo_reg_personalizado
                else 0
            )

            ultimo_oficio = max(ultimo_oficio_apreensao, ultimo_oficio_personalizado)
            novo_numero = (ultimo_oficio + 1) if ultimo_oficio > 0 else 100

            # Atualizar os dados do request com o numero gerado e usuario
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Salvar a instancia
            serializer.save(
                numero_oficio=novo_numero,
                ano_oficio=ano_atual,
                usuario=request.user if request.user.is_authenticated else None,
            )

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class PolicialFilter(django_filters.FilterSet):
    nome = django_filters.CharFilter(field_name="nome", lookup_expr="icontains")
    rg = django_filters.CharFilter(field_name="rg", lookup_expr="icontains")

    class Meta:
        model = Policial
        fields = ["nome", "rg"]


class PolicialViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Policial.objects.all().order_by("nome")
    serializer_class = PolicialSerializer
    filter_backends = [
        django_filters.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = PolicialFilter
    search_fields = ["nome", "rg"]
    pagination_class = None


import pytz
from datetime import datetime

class DiarioServicoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = DiarioServico.objects.all().order_by("-data_inicio")
    serializer_class = DiarioServicoSerializer
    pagination_class = None

    @action(detail=False, methods=["get", "post"], url_path="atual-ou-criar")
    def atual_ou_criar(self, request):
        tz = pytz.timezone("America/Sao_Paulo")
        agora = timezone.now().astimezone(tz)

        # Jornada A: 06h30 às 18h30
        # Jornada B: 18h30 às 06h30
        hoje_0630 = agora.replace(hour=6, minute=30, second=0, microsecond=0)
        hoje_1830 = agora.replace(hour=18, minute=30, second=0, microsecond=0)

        if agora >= hoje_1830:
            data_inicio = hoje_1830
            data_fim = hoje_1830 + timedelta(hours=12)
        elif agora >= hoje_0630:
            data_inicio = hoje_0630
            data_fim = hoje_1830
        else:
            data_inicio = hoje_1830 - timedelta(hours=24)
            data_fim = hoje_0630

        diario = DiarioServico.objects.filter(data_inicio=data_inicio, data_fim=data_fim).first()

        if not diario:
            diario = DiarioServico.objects.create(
                data_inicio=data_inicio,
                data_fim=data_fim,
                operador=request.user,
                alteracoes=""
            )

        serializer = self.get_serializer(diario)
        return Response(serializer.data)

    def get_queryset(self):
        queryset = super().get_queryset()
        data_param = self.request.query_params.get("data")
        if data_param:
            try:
                data_pesquisa = datetime.strptime(data_param, "%Y-%m-%d").date()
                queryset = queryset.filter(
                    data_inicio__date=data_pesquisa
                )
            except ValueError:
                pass
        return queryset
