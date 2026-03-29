import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import filters, permissions
from django.http import HttpResponse
from django_filters import rest_framework as django_filters
from django.utils import timezone
from .models import Apreensao, LoteIncineracao
from .serializers import ApreensaoSerializer, LoteIncineracaoSerializer

import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

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

    @action(detail=False, methods=["post"])
    def finalizar_lote(self, request):
        """
        Finaliza lote: recebe lote_id e altera status das apreensões para 'queima_pronta'.
        Pode receber um arquivo_pdf para anexar a todos os itens do lote.
        """
        lote_id = request.data.get("lote_id")
        arquivo_pdf = request.FILES.get("arquivo_pdf")

        if not lote_id:
            return Response(
                {"error": "lote_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            lote = LoteIncineracao.objects.get(id=lote_id)
        except LoteIncineracao.DoesNotExist:
            return Response(
                {"error": "Lote não encontrado"}, status=status.HTTP_404_NOT_FOUND
            )

        apreensoes = Apreensao.objects.filter(
            lote_incineracao=lote, status="incineracao"
        )

        if apreensoes.count() < 20:
             # Permitir finalizar com menos se for o último caso, mas manter a regra de 20 por segurança
             # O usuário pode querer flexibilidade, mas vou manter a regra solicitada anteriormente
            return Response(
                {"error": f"Lote precisa de 20 itens para finalizar. Atual: {apreensoes.count()}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        count = 0
        for apreensao in apreensoes:
            apreensao.status = "queima_pronta"
            if arquivo_pdf:
                apreensao.arquivo_pdf = arquivo_pdf
            apreensao.save()
            count += 1

        logger.info(f"Lote {lote.protocolo} finalizado com {count} apreensões. PDF anexo: {bool(arquivo_pdf)}")

        return Response(
            {
                "message": f"Lote {lote.protocolo} finalizada com sucesso",
                "itens_finalizados": count,
                "documento_anexado": bool(arquivo_pdf)
            }
        )


class RelatorioIncineracaoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Apreensao.objects.all()

        data_inicio = request.GET.get("data_inicio")
        data_fim = request.GET.get("data_fim")
        vara = request.GET.get("vara")
        substancia = request.GET.get("substancia")
        status_filter = request.GET.get("status")
        bou = request.GET.get("bou")
        processo = request.GET.get("processo")
        reu = request.GET.get("reu")

        if data_inicio:
            qs = qs.filter(data_criacao__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data_criacao__lte=data_fim)
        if vara:
            qs = qs.filter(vara__icontains=vara)
        if substancia:
            qs = qs.filter(substancia__icontains=substancia)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if bou:
            qs = qs.filter(bou__icontains=bou)
        if processo:
            qs = qs.filter(processo__icontains=processo)
        if reu:
            qs = qs.filter(reu__icontains=reu)

        detalhado = qs.values(
            "id",
            "bou",
            "substancia",
            "peso",
            "vara",
            "data_criacao",
            "status",
            "processo",
            "reu",
            "lote_incineracao__numero",
            "lote_incineracao__data_criacao",
        ).order_by("-data_criacao")[:500]

        status_labels = {
            "conferencia": "Aguardando Balança",
            "cofre": "No Cofre",
            "incineracao": "Lotes (P. Queima)",
            "queima_pronta": "Incinerado",
        }

        detalhado_formatado = []
        for item in detalhado:
            status_desc = status_labels.get(item["status"], item["status"])

            # Se já está associado a um lote (seja Incinerado ou em Montagem)
            if item.get("lote_incineracao__numero"):
                lote_num = str(item["lote_incineracao__numero"]).zfill(2)
                lote_data = (
                    item["lote_incineracao__data_criacao"].strftime("%d/%m/%y")
                    if item.get("lote_incineracao__data_criacao")
                    else "S/D"
                )
                status_desc = f"{status_desc} (Lote {lote_num} - {lote_data})"

            detalhado_formatado.append(
                {
                    "id": item["id"],
                    "bou": item["bou"],
                    "processo": item["processo"],
                    "reu": item["reu"],
                    "substancia": item["substancia"],
                    "peso": item["peso"],
                    "vara": item["vara"],
                    "status_label": status_desc,
                    "data": (
                        item["data_criacao"].strftime("%Y-%m-%d")
                        if item["data_criacao"]
                        else None
                    ),
                }
            )

        return Response({"detalhado": detalhado_formatado})


class RelatorioIncineracaoPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Apreensao.objects.select_related("lote_incineracao").all()

        data_inicio = request.GET.get("data_inicio")
        data_fim = request.GET.get("data_fim")
        vara = request.GET.get("vara")
        substancia = request.GET.get("substancia")
        status_filter = request.GET.get("status")
        bou = request.GET.get("bou")
        processo = request.GET.get("processo")
        reu = request.GET.get("reu")

        if data_inicio:
            qs = qs.filter(data_criacao__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data_criacao__lte=data_fim)
        if vara:
            qs = qs.filter(vara__icontains=vara)
        if substancia:
            qs = qs.filter(substancia__icontains=substancia)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if bou:
            qs = qs.filter(bou__icontains=bou)
        if processo:
            qs = qs.filter(processo__icontains=processo)
        if reu:
            qs = qs.filter(reu__icontains=reu)

        qs = qs.order_by("data_criacao")[:1000]  # Evitar travamentos

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

        # Cabeçalho como Certidão de Queima
        elements.append(Paragraph("POLÍCIA MILITAR DO PARANÁ - 6º BPM", title_style))
        elements.append(Paragraph("PRIMEIRO CARTÓRIO - CASCAVEL", subtitle_title_style))

        elements.append(
            Paragraph(
                "RELATÓRIO DE AUDITORIA E RASTREIO",
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

        periodo_texto = f"Período: {data_inicio or 'Início'} a {data_fim or 'Hoje'}"
        filtros_usados = []
        if vara:
            filtros_usados.append(f"Vara: {vara}")
        if substancia:
            filtros_usados.append(f"Substância: {substancia}")
        if status_filter:
            filtros_usados.append(f"Status: {status_filter}")
        if bou:
            filtros_usados.append(f"BOU: {bou}")
        if processo:
            filtros_usados.append(f"Processo: {processo}")
        if reu:
            filtros_usados.append(f"Réu/Autor: {reu}")

        filtros_str = " | ".join(filtros_usados) if filtros_usados else "Nenhum"

        info = f"<b>{periodo_texto}</b><br/><b>Filtros Aplicados:</b> {filtros_str}"
        elements.append(Paragraph(info, normal_style))
        elements.append(Spacer(1, 15))

        # Agrupar por mes/ano
        from collections import defaultdict

        meses = {
            1: "Janeiro",
            2: "Fevereiro",
            3: "Março",
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
            if item.data_criacao:
                mes_ano = (
                    f"{meses[item.data_criacao.month]} de {item.data_criacao.year}"
                )
            else:
                mes_ano = "Data Desconhecida"
            agrupado[mes_ano].append(item)

        status_labels = {
            "conferencia": "Aguardando Balança",
            "cofre": "No Cofre",
            "incineracao": "Lotes",
            "queima_pronta": "Incinerado",
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
                        "Substância",
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
                            item.lote_incineracao.data_criacao.strftime("%d/%m/%y")
                            if item.lote_incineracao.data_criacao
                            else "S/D"
                        )
                        status_desc = f"{status_desc}\n(Lote {lote_num} - {lote_data})"

                    data.append(
                        [
                            linha1,
                            item.substancia or "-",
                            f"{item.peso} {item.unidade}",
                            status_desc,
                            (
                                item.data_criacao.strftime("%d/%m/%Y")
                                if item.data_criacao
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
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dc2626")),
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

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="relatorio_radar.pdf"'
        return response
